-- M0 foundation: identities, sessions, companies, memberships, jobs, audit.
-- Tenant isolation is enforced by row-level security. The web server connects as
-- lex_app (no BYPASSRLS) and sets app.user_id per transaction. The worker connects
-- as lex_worker (BYPASSRLS) and must re-check membership in code (A23).

create extension if not exists pgcrypto;

create schema if not exists app;

-- Roles are created idempotently; passwords are assigned by scripts/db-setup, never here.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lex_app') then
    create role lex_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'lex_worker') then
    create role lex_worker nologin bypassrls;
  end if;
end $$;

grant usage on schema public, app to lex_app, lex_worker;

-- Current actor as set by the application per transaction. Returns null for no actor.
create or replace function app.current_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index sessions_user_id_idx on sessions(user_id);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  lifecycle_stage text not null check (lifecycle_stage in ('idea','pre_registration','registered','operating','scaling')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','member','reviewer')),
  matter_scope jsonb,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index memberships_user_id_idx on memberships(user_id);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null check (kind in ('assessment','document_parse','analysis','export','noop')),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_code text,
  error_message text,
  requested_by uuid not null references users(id),
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);
create index jobs_queue_idx on jobs(status, created_at) where status in ('queued','running');

create table audit_events (
  id bigint generated always as identity primary key,
  company_id uuid references companies(id) on delete cascade,
  actor_user_id uuid references users(id),
  action text not null,
  object_type text not null,
  object_id text,
  object_version text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_company_idx on audit_events(company_id, created_at desc);

-- SECURITY DEFINER avoids recursive RLS evaluation on memberships.
create or replace function app.is_active_member(target_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.company_id = target_company
      and m.user_id = app.current_user_id()
      and m.revoked_at is null
      and m.accepted_at is not null
  )
$$;

create or replace function app.has_role(target_company uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.company_id = target_company
      and m.user_id = app.current_user_id()
      and m.revoked_at is null
      and m.accepted_at is not null
      and m.role = any(roles)
  )
$$;

-- Atomic company + owner membership creation for the current actor.
create or replace function app.create_company_with_owner(p_name text, p_stage text) returns companies
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := app.current_user_id();
  created companies;
begin
  if actor is null then
    raise exception 'no actor' using errcode = '28000';
  end if;
  insert into companies (name, lifecycle_stage, created_by)
  values (p_name, p_stage, actor) returning * into created;
  insert into memberships (company_id, user_id, role, accepted_at)
  values (created.id, actor, 'owner', now());
  insert into audit_events (company_id, actor_user_id, action, object_type, object_id)
  values (created.id, actor, 'company.created', 'company', created.id::text);
  return created;
end $$;

revoke all on function app.create_company_with_owner(text, text) from public;
grant execute on function app.create_company_with_owner(text, text) to lex_app;
grant execute on function app.is_active_member(uuid), app.has_role(uuid, text[]), app.current_user_id() to lex_app, lex_worker;

create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger users_touch before update on users for each row execute function app.touch_updated_at();
create trigger companies_touch before update on companies for each row execute function app.touch_updated_at();
create trigger jobs_touch before update on jobs for each row execute function app.touch_updated_at();

-- Job status transitions are enforced at the database as well as in code.
create or replace function app.enforce_job_transition() returns trigger language plpgsql as $$
begin
  if old.status = new.status then return new; end if;
  if old.status in ('succeeded','failed','cancelled') then
    raise exception 'job % is terminal (%)', old.id, old.status using errcode = '23514';
  end if;
  if old.status = 'queued' and new.status not in ('running','cancelled') then
    raise exception 'invalid job transition % -> %', old.status, new.status using errcode = '23514';
  end if;
  if old.status = 'running' and new.status not in ('succeeded','failed','queued','cancelled') then
    raise exception 'invalid job transition % -> %', old.status, new.status using errcode = '23514';
  end if;
  return new;
end $$;
create trigger jobs_transition before update on jobs for each row execute function app.enforce_job_transition();

-- Row-level security -------------------------------------------------------
alter table users enable row level security;
alter table sessions enable row level security;
alter table companies enable row level security;
alter table memberships enable row level security;
alter table jobs enable row level security;
alter table audit_events enable row level security;

-- Authentication lookups run before an actor is known; the app role may read/write
-- users and sessions. Tenant data stays behind membership policies.
grant select, insert, update on users to lex_app;
grant select, insert, update, delete on sessions to lex_app;
grant select, insert, update on companies to lex_app;
grant select, insert, update on memberships to lex_app;
grant select, insert, update on jobs to lex_app;
grant select, insert on audit_events to lex_app;
grant usage, select on sequence audit_events_id_seq to lex_app;
grant select, update on jobs to lex_worker;
grant select on companies, memberships, users to lex_worker;
grant select, insert on audit_events to lex_worker;
grant usage, select on sequence audit_events_id_seq to lex_worker;

create policy users_auth_access on users for all to lex_app using (true) with check (true);
create policy sessions_auth_access on sessions for all to lex_app using (true) with check (true);

create policy companies_member_read on companies for select to lex_app
  using (app.is_active_member(id));
create policy companies_owner_update on companies for update to lex_app
  using (app.has_role(id, array['owner']))
  with check (app.has_role(id, array['owner']));
-- Inserts go through app.create_company_with_owner; no direct insert policy.

create policy memberships_member_read on memberships for select to lex_app
  using (app.is_active_member(company_id));
create policy memberships_owner_write on memberships for insert to lex_app
  with check (app.has_role(company_id, array['owner']));
create policy memberships_owner_update on memberships for update to lex_app
  using (app.has_role(company_id, array['owner']))
  with check (app.has_role(company_id, array['owner']));

create policy jobs_member_read on jobs for select to lex_app
  using (app.is_active_member(company_id));
create policy jobs_member_insert on jobs for insert to lex_app
  with check (app.is_active_member(company_id) and requested_by = app.current_user_id());
create policy jobs_member_cancel on jobs for update to lex_app
  using (app.is_active_member(company_id))
  with check (app.is_active_member(company_id));

create policy audit_member_read on audit_events for select to lex_app
  using (company_id is not null and app.is_active_member(company_id));
create policy audit_member_insert on audit_events for insert to lex_app
  with check (company_id is null or app.is_active_member(company_id));

-- Readiness probes report applied migration count without privileged access.
grant select on schema_migrations to lex_app, lex_worker;
