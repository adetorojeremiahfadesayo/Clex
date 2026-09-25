-- Matter workspace: tenant-bound records and private document bytes.
create table matters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null check (kind in ('employment','supplier','other')),
  title text not null check (length(title) between 1 and 200),
  summary text not null default '',
  context jsonb not null default '{}'::jsonb,
  profile_revision_id uuid,
  status text not null default 'open' check (status in ('open','needs_review','closed')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key(profile_revision_id, company_id) references profile_revisions(id, company_id)
);
create index matters_company_idx on matters(company_id, created_at desc);
create trigger matters_touch before update on matters for each row execute function app.touch_updated_at();

create table matter_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  matter_id uuid not null,
  filename text not null,
  mime_type text not null,
  byte_size int not null check(byte_size > 0 and byte_size <= 10485760),
  sha256 text not null,
  original_bytes bytea not null,
  extracted_text text not null default '',
  extraction_status text not null check(extraction_status in ('readable','ocr_required','failed')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key(matter_id, company_id) references matters(id, company_id) on delete cascade
);
create index matter_documents_matter_idx on matter_documents(matter_id, created_at desc);

create table matter_analyses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  matter_id uuid not null,
  document_id uuid,
  profile_revision_id uuid,
  mode text not null check(mode in ('preparation','live')),
  status text not null check(status in ('completed','needs_review','failed')),
  findings jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  error_message text,
  provider text,
  model text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key(matter_id, company_id) references matters(id, company_id) on delete cascade,
  foreign key(document_id, company_id) references matter_documents(id, company_id) on delete set null (document_id),
  foreign key(profile_revision_id, company_id) references profile_revisions(id, company_id)
);
create index matter_analyses_matter_idx on matter_analyses(matter_id, created_at desc);

create table matter_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  matter_id uuid not null,
  version int not null,
  body text not null,
  status text not null default 'unreviewed' check(status in ('unreviewed','review_requested')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique(matter_id, version),
  foreign key(matter_id, company_id) references matters(id, company_id) on delete cascade
);

create table matter_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  matter_id uuid not null,
  text text not null,
  status text not null default 'open' check(status in ('open','done')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(matter_id, company_id) references matters(id, company_id) on delete cascade
);
create trigger matter_actions_touch before update on matter_actions for each row execute function app.touch_updated_at();

grant select, insert, update on matters, matter_analyses, matter_drafts, matter_actions to lex_app;
grant select, insert, delete on matter_documents to lex_app;
alter table matters enable row level security;
alter table matter_documents enable row level security;
alter table matter_analyses enable row level security;
alter table matter_drafts enable row level security;
alter table matter_actions enable row level security;

create policy matters_read on matters for select to lex_app using (app.is_active_member(company_id));
create policy matters_insert on matters for insert to lex_app with check (app.has_role(company_id, array['owner','member']) and created_by = app.current_user_id());
create policy matters_update on matters for update to lex_app using (app.has_role(company_id, array['owner','member'])) with check (app.has_role(company_id, array['owner','member']));
create policy documents_read on matter_documents for select to lex_app using (app.is_active_member(company_id));
create policy documents_insert on matter_documents for insert to lex_app with check (app.has_role(company_id, array['owner','member']) and created_by = app.current_user_id());
create policy documents_delete on matter_documents for delete to lex_app using (app.has_role(company_id, array['owner','member']));
create policy analyses_read on matter_analyses for select to lex_app using (app.is_active_member(company_id));
create policy analyses_insert on matter_analyses for insert to lex_app with check (app.has_role(company_id, array['owner','member']) and created_by = app.current_user_id());
create policy drafts_read on matter_drafts for select to lex_app using (app.is_active_member(company_id));
create policy drafts_insert on matter_drafts for insert to lex_app with check (app.has_role(company_id, array['owner','member']) and created_by = app.current_user_id());
create policy drafts_update on matter_drafts for update to lex_app using (app.has_role(company_id, array['owner','member'])) with check (app.has_role(company_id, array['owner','member']));
create policy actions_read on matter_actions for select to lex_app using (app.is_active_member(company_id));
create policy actions_insert on matter_actions for insert to lex_app with check (app.has_role(company_id, array['owner','member']) and created_by = app.current_user_id());
create policy actions_update on matter_actions for update to lex_app using (app.has_role(company_id, array['owner','member'])) with check (app.has_role(company_id, array['owner','member']));
