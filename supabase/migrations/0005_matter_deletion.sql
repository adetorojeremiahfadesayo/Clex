-- Deleting a document must also remove analyses and drafts that may contain its text.
grant delete on matter_analyses, matter_drafts to lex_app;
create policy analyses_delete on matter_analyses for delete to lex_app
  using (app.has_role(company_id, array['owner','member']));
create policy drafts_delete on matter_drafts for delete to lex_app
  using (app.has_role(company_id, array['owner','member']));
