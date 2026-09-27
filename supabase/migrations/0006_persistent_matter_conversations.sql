-- Persist matter conversations in the same tenant scope as the documents they discuss.
create table matter_chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  matter_id uuid not null,
  role text not null check (role in ('user','assistant')),
  body text not null check (length(body) between 1 and 4000),
  findings jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  mode text check (mode is null or mode in ('preparation','live')),
  draft_version int,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  foreign key (matter_id, company_id) references matters(id, company_id) on delete cascade
);
create index matter_chat_messages_order_idx on matter_chat_messages(company_id, matter_id, created_at, id);
grant select, insert, delete on matter_chat_messages to lex_app;
alter table matter_chat_messages enable row level security;
create policy matter_chat_read on matter_chat_messages for select to lex_app using (app.is_active_member(company_id));
create policy matter_chat_insert on matter_chat_messages for insert to lex_app with check (app.has_role(company_id, array['owner','member']) and created_by = app.current_user_id());
create policy matter_chat_delete on matter_chat_messages for delete to lex_app using (app.has_role(company_id, array['owner','member']));
