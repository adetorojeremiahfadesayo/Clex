-- M1 company start: profile revisions with provenance, assessments, checklist items.

create table profile_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  version int not null,
  previous_revision_id uuid references profile_revisions(id),
  facts jsonb not null default '{}'::jsonb,
  confirmed_by uuid not null references users(id),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (company_id, version),
  -- Composite FK target so children can prove the revision belongs to the same company.
  unique (id, company_id)
);
create index profile_revisions_company_idx on profile_revisions(company_id, version desc);

alter table companies add column current_profile_revision_id uuid;
alter table companies add constraint companies_current_revision_fk
  foreign key (current_profile_revision_id, id) references profile_revisions(id, company_id);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_revision_id uuid not null,
  result jsonb not null,
  generated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (profile_revision_id, company_id) references profile_revisions(id, company_id)
);
create index assessments_company_idx on assessments(company_id, generated_at desc);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  rule_id text not null,
  rule_version text not null,
  assessment_id uuid not null,
  status text not null default 'suggested' check (status in (
    'suggested','accepted','in_progress','evidence_submitted','user_completed',
    'reviewer_verified','dismissed_with_reason','blocked','superseded')),
  version int not null default 1,
  evidence text,
  reason text,
  completed_by uuid references users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, rule_id),
  foreign key (assessment_id, company_id) references assessments(id, company_id)
);
create trigger checklist_items_touch before update on checklist_items for each row execute function app.touch_updated_at();

-- Every update must carry the version the caller saw; the row version increments.
create or replace function app.enforce_checklist_version() returns trigger language plpgsql as $$
begin
  if new.version <> old.version + 1 then
    raise exception 'checklist item % version conflict (have %, got %)', old.id, old.version, new.version - 1 using errcode = '40001';
  end if;
  if old.status in ('reviewer_verified','superseded') and new.status <> old.status then
    raise exception 'checklist item % is terminal (%)', old.id, old.status using errcode = '23514';
  end if;
  return new;
end $$;
create trigger checklist_items_version before update on checklist_items for each row execute function app.enforce_checklist_version();

-- Confirm a new revision atomically: insert, bump the company pointer, audit.
create or replace function app.confirm_profile_revision(p_company uuid, p_facts jsonb, p_reason text) returns profile_revisions
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := app.current_user_id();
  prev profile_revisions;
  created profile_revisions;
begin
  if actor is null or not app.has_role(p_company, array['owner','member']) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  perform 1 from companies where id = p_company for update;
  select * into prev from profile_revisions where company_id = p_company order by version desc limit 1;
  insert into profile_revisions (company_id, version, previous_revision_id, facts, confirmed_by, reason)
  values (p_company, coalesce(prev.version, 0) + 1, prev.id, p_facts, actor, p_reason)
  returning * into created;
  update companies set current_profile_revision_id = created.id where id = p_company;
  insert into audit_events (company_id, actor_user_id, action, object_type, object_id, object_version, summary)
  values (p_company, actor, 'profile.revision_confirmed', 'profile_revision', created.id::text, created.version::text,
          jsonb_build_object('fact_keys', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p_facts) k)));
  return created;
end $$;
revoke all on function app.confirm_profile_revision(uuid, jsonb, text) from public;
grant execute on function app.confirm_profile_revision(uuid, jsonb, text) to lex_app;

grant select on profile_revisions, assessments to lex_app;
grant insert on assessments to lex_app;
grant select, insert, update on checklist_items to lex_app;
grant select on profile_revisions, assessments, checklist_items to lex_worker;

alter table profile_revisions enable row level security;
alter table assessments enable row level security;
alter table checklist_items enable row level security;

create policy profile_revisions_member_read on profile_revisions for select to lex_app
  using (app.is_active_member(company_id));
create policy assessments_member_read on assessments for select to lex_app
  using (app.is_active_member(company_id));
create policy assessments_member_insert on assessments for insert to lex_app
  with check (app.has_role(company_id, array['owner','member']));
create policy checklist_member_read on checklist_items for select to lex_app
  using (app.is_active_member(company_id));
create policy checklist_member_insert on checklist_items for insert to lex_app
  with check (app.has_role(company_id, array['owner','member']));
create policy checklist_member_update on checklist_items for update to lex_app
  using (app.is_active_member(company_id))
  with check (app.is_active_member(company_id));
