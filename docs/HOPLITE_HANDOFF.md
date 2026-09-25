# Hoplite handoff

Updated 25 September 2026. The repository contains a working local company counsel workspace. Start from `main` after merged PR #4; PR #5 adds broader document preparation and regression checks. Read [STATUS.md](STATUS.md) for verified behavior and open work. Do not rebuild the app or add sign-in/sign-out screens.

## Current product

- A visitor gets an isolated guest workspace and secure cookie session automatically. They can create a company, complete an adaptive profile and see a registration/readiness checklist.
- Employment, supplier and other matters accept company-specific context. A matter can hold private TXT, DOCX and text-PDF uploads, editable draft outlines, action items and a printable lawyer packet.
- Preparation findings are labelled unreviewed and cite exact extracted text. Optional live OpenAI or Anthropic analysis is implemented server-side, but has not been verified with real provider credentials.
- PostgreSQL row-level security separates company data. Original uploads live in PostgreSQL, so the database requires persistent storage and backups.
- Five jurisdiction packs are draft research pointers, not reviewed legal coverage. No legal-content publication is implied by passing software tests.

## Bring up a preview

1. Connect the private GitHub repository `adetorojeremiahfadesayo/lex-company-counsel` to Hoplite with repository-scoped access. Use the current `main` branch and review PR #5 as the follow-up change.
2. Provide a persistent PostgreSQL instance. Configure `DATABASE_URL` for setup/migrations and `APP_DATABASE_URL` for the restricted web role as specified in `.env.example` and the README. Do not run the web app through the privileged database role.
3. Run `pnpm install --frozen-lockfile`, `pnpm db:setup` for the new database, then `pnpm build`. Start the web process using the platform's host/port settings. Check `/api/health` and `/api/ready`, then create a fresh guest company in the preview.
4. Store `LLM_PROVIDER`, `LLM_MODEL` and `LLM_API_KEY` as server-only secrets when a provider is chosen. Make one real, consented analysis run and inspect the saved result and provider errors. Never put keys in chat, GitHub issues, a commit or the browser bundle.
5. Test the full preview journey: company profile, checklist, each matter type, TXT/DOCX/text-PDF upload, preparation findings, draft outline and lawyer packet. Verify another browser cannot read the first browser's company or file. Capture errors and the actual preview URL.
6. Add a tested restore path and document retention policy before inviting real companies to upload documents. A lost or expired guest cookie currently loses access to the workspace.

The worker handles the older durable job flow; matter analysis currently runs in the web request and does **not** yet use that queue. Keep the web and worker processes distinct if older jobs are needed. OCR, reviewer invites, legal review and publication, production deployment and account recovery remain open. Do not describe a development preview as production hosting.

## Useful commands

| Command | Purpose |
|---|---|
| `pnpm typecheck` | Strict TypeScript check |
| `pnpm lint` | Static lint |
| `PG_ADMIN_URL=... pnpm test` | Full tests including fresh PostgreSQL integration database |
| `pnpm build` | Production compilation |
| `pnpm db:setup` | Create roles/database and apply migrations to a new instance |
| `pnpm db:migrate` | Apply versioned migrations to an existing instance |
| `pnpm dev` | Local web server |
| `pnpm dev:worker` | Older durable job worker |

`pnpm test` without `PG_ADMIN_URL` skips database integration tests. The current verified local run is 56/56 tests with PostgreSQL enabled, plus passing typecheck, lint and build. No live model request or cloud deployment has been verified.

## Paste-ready next task for Hoplite

```text
Continue the current lex-company-counsel repository. Read AGENTS.md, README.md,
docs/STATUS.md, docs/HOPLITE_HANDOFF.md and IMPLEMENTATION_PLAN.md first.
Use main plus the follow-up document-analysis PR if it is not merged.

Bring up a persistent private preview with restricted PostgreSQL access. Keep
automatic guest workspaces and do not add sign-in or sign-out. Verify all three
matter flows, uploads, findings, drafts, checklist and lawyer export in the
rendered preview. Treat unreviewed content as preparation, not legal advice.

If server-only model credentials are available, verify one consented live call
and visible failure behavior. Otherwise report that dependency clearly and
continue independent preview work. Do not fabricate a provider result, legal
review, deployed URL, or production readiness. Record exact test outcomes and
remaining gaps in docs/STATUS.md, then return a reviewable PR.
```
