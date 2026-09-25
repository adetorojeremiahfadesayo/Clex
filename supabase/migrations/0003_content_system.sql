-- Superseded checklist items may be revived when a rule applies again under new content;
-- only reviewer_verified stays terminal.
create or replace function app.enforce_checklist_version() returns trigger language plpgsql as $$
begin
  if new.version <> old.version + 1 then
    raise exception 'checklist item % version conflict (have %, got %)', old.id, old.version, new.version - 1 using errcode = '40001';
  end if;
  if old.status = 'reviewer_verified' and new.status <> old.status then
    raise exception 'checklist item % is terminal (%)', old.id, old.status using errcode = '23514';
  end if;
  return new;
end $$;

-- M2 content system: platform content roles, source registry, jurisdiction packs,
-- publication workflow and evaluation runs. Content is global (not tenant data) but
-- writes are restricted to platform roles and publication requires a distinct reviewer.

alter table users add column platform_role text not null default 'none'
  check (platform_role in ('none','content_editor','content_reviewer'));

create or replace function app.platform_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select platform_role from users where id = app.current_user_id()), 'none')
$$;
grant execute on function app.platform_role() to lex_app, lex_worker;

create table sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  market text not null check (market in ('NG','GB','US','EU','CN')),
  authority text not null,
  title text not null,
  kind text not null check (kind in ('primary_law','regulator_guidance','official_procedure','official_directory','reviewer_commentary')),
  permitted_use text not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  version int not null,
  url text not null check (url like 'https://%'),
  language text not null default 'en',
  effective_from date,
  effective_to date,
  checked_at date not null,
  excerpt text not null default '',
  locator text not null default '',
  content_hash text not null,
  review_state text not null default 'unreviewed' check (review_state in ('unreviewed','reviewed','superseded')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (source_id, version)
);

create table packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  market text not null check (market in ('NG','GB','US','EU','CN')),
  title text not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table pack_versions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references packs(id) on delete cascade,
  version int not null,
  status text not null default 'draft' check (status in ('draft','under_review','published','stale','withdrawn')),
  content jsonb not null,
  content_hash text not null,
  author_id uuid not null references users(id),
  reviewer_id uuid references users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack_id, version)
);
-- At most one published version per pack.
create unique index pack_versions_one_published on pack_versions(pack_id) where status = 'published';
create trigger pack_versions_touch before update on pack_versions for each row execute function app.touch_updated_at();

create table pack_evaluations (
  id uuid primary key default gen_random_uuid(),
  pack_version_id uuid not null references pack_versions(id) on delete cascade,
  content_hash text not null,
  total int not null,
  passed int not null,
  failures jsonb not null default '[]'::jsonb,
  run_by uuid not null references users(id),
  run_at timestamptz not null default now()
);

-- Publication gate: reviewer must hold the platform reviewer role, differ from the author,
-- and a passing evaluation must exist for the exact content hash.
create or replace function app.enforce_pack_transition() returns trigger language plpgsql as $$
declare
  ok boolean;
begin
  if old.status = new.status then
    if old.status <> 'draft' and new.content_hash <> old.content_hash then
      raise exception 'pack version % content is frozen once it leaves draft', old.id using errcode = '23514';
    end if;
    return new;
  end if;
  if old.status = 'draft' and new.status not in ('under_review','withdrawn') then raise exception 'invalid pack transition % -> %', old.status, new.status using errcode = '23514'; end if;
  if old.status = 'under_review' and new.status not in ('published','draft','withdrawn') then raise exception 'invalid pack transition % -> %', old.status, new.status using errcode = '23514'; end if;
  if old.status = 'published' and new.status not in ('stale','withdrawn') then raise exception 'invalid pack transition % -> %', old.status, new.status using errcode = '23514'; end if;
  if old.status = 'stale' and new.status <> 'withdrawn' then raise exception 'invalid pack transition % -> %', old.status, new.status using errcode = '23514'; end if;
  if old.status = 'withdrawn' then raise exception 'pack version % is withdrawn', old.id using errcode = '23514'; end if;
  if new.content_hash <> old.content_hash then
    raise exception 'content cannot change during a status transition' using errcode = '23514';
  end if;
  if new.status = 'published' then
    if new.reviewer_id is null then raise exception 'publication requires a reviewer' using errcode = '23514'; end if;
    if new.reviewer_id = new.author_id then raise exception 'author cannot publish their own pack version' using errcode = '23514'; end if;
    select platform_role = 'content_reviewer' into ok from users where id = new.reviewer_id;
    if not coalesce(ok, false) then raise exception 'reviewer lacks content_reviewer role' using errcode = '23514'; end if;
    select exists (select 1 from pack_evaluations e where e.pack_version_id = new.id and e.content_hash = new.content_hash and e.passed = e.total and e.total > 0) into ok;
    if not ok then raise exception 'publication requires a passing evaluation for this exact content' using errcode = '23514'; end if;
    new.published_at := now();
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end $$;
create trigger pack_versions_transition before update on pack_versions for each row execute function app.enforce_pack_transition();

-- Publishing supersedes the previously published version of the same pack.
create or replace function app.supersede_previous_published() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    update pack_versions set status = 'stale', status_reason = 'superseded by version ' || new.version
     where pack_id = new.pack_id and id <> new.id and status = 'published';
  end if;
  return new;
end $$;
create trigger pack_versions_supersede before update on pack_versions for each row execute function app.supersede_previous_published();

grant select on sources, source_versions, packs, pack_versions, pack_evaluations to lex_app, lex_worker;
grant insert on sources, source_versions, packs, pack_versions, pack_evaluations to lex_app;
grant update on pack_versions, source_versions, sources, packs to lex_app;
grant update (platform_role) on users to lex_app;

alter table sources enable row level security;
alter table source_versions enable row level security;
alter table packs enable row level security;
alter table pack_versions enable row level security;
alter table pack_evaluations enable row level security;

-- Any signed-in user may read published packs and their sources; editors/reviewers read everything.
create policy sources_read on sources for select to lex_app using (true);
create policy source_versions_read on source_versions for select to lex_app using (true);
create policy packs_read on packs for select to lex_app using (true);
create policy pack_versions_read on pack_versions for select to lex_app
  using (status in ('published','stale') or app.platform_role() in ('content_editor','content_reviewer'));
create policy pack_evaluations_read on pack_evaluations for select to lex_app
  using (app.platform_role() in ('content_editor','content_reviewer'));

create policy sources_editor_insert on sources for insert to lex_app
  with check (app.platform_role() in ('content_editor','content_reviewer') and created_by = app.current_user_id());
create policy sources_editor_update on sources for update to lex_app
  using (app.platform_role() in ('content_editor','content_reviewer')) with check (app.platform_role() in ('content_editor','content_reviewer'));
create policy packs_editor_update on packs for update to lex_app
  using (app.platform_role() in ('content_editor','content_reviewer')) with check (app.platform_role() in ('content_editor','content_reviewer'));
create policy source_versions_editor_insert on source_versions for insert to lex_app
  with check (app.platform_role() in ('content_editor','content_reviewer') and created_by = app.current_user_id());
create policy source_versions_reviewer_update on source_versions for update to lex_app
  using (app.platform_role() = 'content_reviewer') with check (app.platform_role() = 'content_reviewer');
create policy packs_editor_insert on packs for insert to lex_app
  with check (app.platform_role() in ('content_editor','content_reviewer') and created_by = app.current_user_id());
create policy pack_versions_editor_insert on pack_versions for insert to lex_app
  with check (app.platform_role() in ('content_editor','content_reviewer') and author_id = app.current_user_id() and status = 'draft');
create policy pack_versions_update on pack_versions for update to lex_app
  using (app.platform_role() in ('content_editor','content_reviewer'))
  with check (app.platform_role() in ('content_editor','content_reviewer'));
create policy pack_evaluations_insert on pack_evaluations for insert to lex_app
  with check (app.platform_role() in ('content_editor','content_reviewer') and run_by = app.current_user_id());
