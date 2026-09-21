# Implementation status

Updated: 2026-09-21 (M0 foundation).

| Area | Status |
|---|---|
| Agreed product direction | Documented |
| Implementation plan and Hoplite prompt | Prepared |
| Application code | M0 implemented and tested locally (pnpm monorepo: `apps/web`, `apps/worker`, `packages/domain`, `packages/db`) |
| Database/auth/storage | Local PostgreSQL 16 with RLS, versioned SQL migrations, cookie sessions (scrypt password hashes). Supabase project and object storage not configured |
| Live model integration | Not configured; `/api/ready` reports `no_model_configured`. No model calls exist yet |
| Jurisdiction packs | Research pointers only; none reviewed or published |
| Automated tests | 19 Vitest tests passing locally (isolation, job queue, migrations, env). Playwright E2E not yet written |
| Browser verification | Sign-up → company → jobs → sign-out/in journey inspected on desktop (1440×900) and mobile (390×844) in the Hoplite preview |
| Hoplite repository connection | Connected; `.hoplite/settings.json` provides setup and run scripts |
| Preview/production deployment | Hoplite preview only (dev server). Not deployed to production |

## Choices for implementation

- Working name: Lex Company Counsel; branding can change.
- Development platform: Hoplite, selected by user.
- Stack (pinned at scaffold): Next.js 16.3.5, React 19.3, TypeScript 5.9 strict, Zod 4.6, node-postgres 8.23, Vitest 4.1, Playwright 1.63, Tailwind 4.3, pnpm 10.26, Node 24.
- Auth: first-party email/password sessions stored in Postgres (hash-only). Supabase Auth remains a documented option; the `users`/`sessions` tables can be swapped for a provider without touching tenant tables.
- Tenancy: `lex_app` database role (no BYPASSRLS) with `app.user_id` set per transaction from the verified session; `lex_worker` role bypasses RLS and re-checks membership in code before releasing results.
- Model provider and production host: not chosen.
- Exact first published jurisdiction/matter packs: assign after reviewer scope confirmation.
- Target countries: Nigeria, UK, US, European countries, China; not a claim of complete coverage.
- Team legal expertise: user indicated available; professional qualifications and jurisdiction coverage not independently verified.

## Milestone evidence log

For each completed milestone record date, commit, environment, commands, pass/fail counts, preview path, live-versus-demo mode, legal-content version, limitations and next task. Do not mark a milestone complete without its exit evidence.

### M0 Foundation — 2026-09-21

Environment: Hoplite sandbox (Modal), Node v24.19.0, pnpm 10.26.0, PostgreSQL 16.14 local. Branch `feat/m0-foundation`.

Commands and outcomes (tested locally; no live model, no production deployment):

| Command | Outcome |
|---|---|
| `pnpm install --frozen-lockfile` | OK, lockfile committed |
| `pnpm typecheck` | 4/4 packages pass under strict TS |
| `pnpm lint` | 0 errors, 0 warnings |
| `PG_ADMIN_URL=… pnpm test` | 4 files, 19/19 tests pass against a fresh per-run database |
| `pnpm db:setup` | Creates database, applies `0001_foundation.sql`, assigns role passwords; idempotent |
| `pnpm build` | Next.js production build succeeds; 16 dynamic routes |
| `pnpm dev` + `pnpm dev:worker` | Web and worker run together via `scripts/sandbox-run.sh` |
| `pnpm seed:demo`, `pnpm eval:legal` | Exit 1 with explicit "not implemented (planned M1/M2)" messages; nothing written |

Acceptance coverage in this milestone:

- A14 (isolation): API returns 404 for another company's record/job by guessed ID and 401 anonymously; database policies reject forged `company_id` and impersonated `requested_by` inserts; `lex_app` confirmed without BYPASSRLS; revoked members lose access immediately (tests `isolation.test.ts`, plus curl and browser checks against the preview).
- A23/A15 groundwork: worker re-checks active membership before releasing a job result; test covers revocation mid-run.
- A20 groundwork: idempotent enqueue, lease-based claim, retry to `max_attempts`, database trigger blocks invalid/terminal transitions.
- A10 (persistence): browser sign-out, deep-link redirect to sign-in, sign-in shows the same company and jobs.
- Worker retry observed live in the UI: job with `failUntilAttempt: 2` failed once (`simulated_failure`) and succeeded on attempt 2.

Browser evidence: `/sign-up`, `/`, `/companies/new`, `/companies/:id/overview`, `/companies/:id/jobs`, `/sign-in` rendered in the preview at 1440×900 and 390×844; no console errors after enabling `allowedDevOrigins` for the sandbox host. Screenshots stored in the thread, not in Git.

Mode: `no_model_configured` (reported by `/api/ready`). No synthetic legal output exists. Legal-content version: none.

Limitations: no Supabase Auth/Storage, no uploads, no matters, no profile revisions, no reviewer invites yet; CI workflow is committed at `.github/workflows-pending/ci.yml` because the GitHub App credential lacks `workflows` permission to push into `.github/workflows/`; an admin must move it (see that folder's README); Playwright E2E suite not written; CI uses a local password for the Postgres service container only.

Next task: M1 Company start (adaptive intake, profile revisions with provenance, assessment, checklist, official links, preparation export).
