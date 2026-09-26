# Implementation status

Updated: 2026-09-26 (live Render preview). Historical milestone notes below describe their state at the time; this section is current.

Codex is now the development tool; Hoplite references in the historical milestone notes record earlier work. The current submission and UI review is in [CODEX_BUILD.md](CODEX_BUILD.md).

### Current implementation — 2026-09-26

- **Live preview:** [lex-company-counsel.onrender.com](https://lex-company-counsel.onrender.com/) is running on Render's free web service and free PostgreSQL in Virginia. Commit `826219b` deployed, `/api/health` and `/api/ready` returned HTTP 200, readiness reported five migrations and `no_model_configured`. Browser QA created a synthetic guest company, saved ten profile facts as revision 1, saw seven starter checklist items with explicit unknown applicability, created a supplier matter, generated a labelled local preparation finding and saved a draft outline. Document upload, exported packet, second-browser isolation and final mobile layout are still to be verified on this deployment. The free database expires 26 October 2026; this is a disposable demo.

- **End-user account screens removed.** Opening the site creates an isolated guest identity and secure cookie session automatically. No sign-in or sign-out routes remain. Data remains tied to that browser session; clearing cookies or session expiry loses access because recovery is not implemented. This is acceptable for a private hackathon preview, not a production account model.
- **M3/M4 usable path:** company profile and checklist lead to employment, supplier and other matters. Each matter keeps its own context, private TXT/DOCX/text-PDF files (10 MB, PDF page limit), extracted text, analyses, editable draft outlines, action items and printable lawyer packet. Uploads live in PostgreSQL bytea under tenant RLS. Deleting a document removes its linked analyses and matter drafts.
- **Contextual analysis:** with no model credentials, a labelled local preparation run identifies missing inputs and points to actual excerpts where found. It checks payment, termination and governing-law wording, plus supplier scope, liability and data handling or employment work-product ownership. These are prompts for review, not legal conclusions. A server-side OpenAI Responses/Anthropic Messages adapter exists and requires explicit per-run consent; model output is schema-validated and document excerpts must be exact substrings. Provider failure persists as failed, with no silent fallback. No live provider request has been verified.
- **Review boundary:** packets and drafts are explicitly unreviewed. No attorney approval, verified legal advice, reviewed employment/supplier templates, reviewer invite flow, durable analysis queue, OCR, or account recovery yet. The five jurisdiction packs remain draft/research pointers until a distinct qualified reviewer validates and publishes them.
- **Local evidence:** PostgreSQL migrations `0001`–`0005` applied; 56/56 tests pass with PostgreSQL integration enabled, including cross-tenant matter/file isolation, derived-data deletion, exact excerpt checks and rejection of fabricated model quotations. Strict typecheck, lint and production build pass. A rendered local browser journey created a company/profile/employment matter, uploaded TXT, DOCX and text PDF files, produced local context-specific findings and a draft outline, and opened the printable packet. Supplier and other matters were also created and analysed locally. The first PDF attempt exposed a bundling error; marking the parsers server-external fixed it and the second upload extracted text successfully.
- **Next before submission:** configure and verify one real model call; lawyer review and publish an initial narrow pack (or clearly demo limited coverage); finish file/parser abuse limits and deployment backups; capture walkthrough and submit. Do not describe these as finished.

### Historical snapshots (21 September 2026)

The following table and milestone notes are retained as development history, not the current feature status.

| Area | Status |
|---|---|
| Agreed product direction | Documented |
| Implementation plan and Hoplite prompt | Prepared |
| Application code | M0 merged; M1 in PR #2; M2 implemented and tested locally on top of M1 (source registry, pack versions, publication workflow, evaluator, `/content` admin UI, pack-aware assessment) |
| Database/auth/storage | Local PostgreSQL 16 with RLS, versioned SQL migrations, cookie sessions (scrypt password hashes). Supabase project and object storage not configured |
| Live model integration | Not configured; `/api/ready` reports `no_model_configured`. No model calls exist yet |
| Jurisdiction packs | Registry and workflow implemented. Five **draft** formation packs (NG, GB, US, EU, CN) seeded from the six official directory pointers; generic preparation rules only, no jurisdiction law, no deadlines. Nothing published by seed; a reviewer publishes only after a passing evaluation. Synthetic starter rules remain the fallback |
| Automated tests | 50 Vitest tests passing locally (adds publication gate, RLS on drafts, schema cross-checks, evaluator, DSL interpreter, scope resolution, A24 fallback). Playwright E2E not yet written |
| Browser verification | M0/M1 journeys plus reviewer: pack under review → Publish blocked by gate → run 4 cases → Publish succeeds; desktop (1440×900) and mobile (390×844) |
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
| `pnpm seed:demo`, `pnpm eval:legal` | Exit 1 with explicit "not implemented" messages at M0; `seed:demo` implemented in M1 |

Acceptance coverage in this milestone:

- A14 (isolation): API returns 404 for another company's record/job by guessed ID and 401 anonymously; database policies reject forged `company_id` and impersonated `requested_by` inserts; `lex_app` confirmed without BYPASSRLS; revoked members lose access immediately (tests `isolation.test.ts`, plus curl and browser checks against the preview).
- A23/A15 groundwork: worker re-checks active membership before releasing a job result; test covers revocation mid-run.
- A20 groundwork: idempotent enqueue, lease-based claim, retry to `max_attempts`, database trigger blocks invalid/terminal transitions.
- A10 (persistence): browser sign-out, deep-link redirect to sign-in, sign-in shows the same company and jobs.
- Worker retry observed live in the UI: job with `failUntilAttempt: 2` failed once (`simulated_failure`) and succeeded on attempt 2.

Browser evidence: `/sign-up`, `/`, `/companies/new`, `/companies/:id/overview`, `/companies/:id/jobs`, `/sign-in` rendered in the preview at 1440×900 and 390×844; no console errors after enabling `allowedDevOrigins` for the sandbox host. Screenshots stored in the thread, not in Git.

Mode: `no_model_configured` (reported by `/api/ready`). No synthetic legal output exists. Legal-content version: none.

Limitations: no Supabase Auth/Storage, no uploads, no matters, no profile revisions, no reviewer invites yet; CI workflow installed at `.github/workflows/ci.yml` by the repository owner; first run (lint, typecheck, 19 tests, db:setup, build) passed on PR #1; Playwright E2E suite not written; CI uses a local password for the Postgres service container only.

Next task: M1 Company start (adaptive intake, profile revisions with provenance, assessment, checklist, official links, preparation export).

### M1 Company start — 2026-09-21

Environment: Hoplite sandbox (Modal), Node v24.19.0, pnpm 10.26.0, PostgreSQL 16.14 local. Branch `feat/m1-company-start` from `main` @ `22a52c9`.

Implemented:

- Adaptive intake (`packages/domain/src/intake.ts`): 22 fact keys in five groups; questions gate on earlier answers (registration details only when registered, market-specific subdivision prompt, worker locations only when people exist). Every question offers **Not sure** where a fact must never be guessed, and **Skip** where safe. Unknown/skipped are stored states, never treated as "no".
- Profile revisions (`0002_company_start.sql`, `app.confirm_profile_revision`): immutable JSON snapshots, monotonic version, `previous_revision_id`, per-fact provenance (`user_confirmed` for all M1 writes), actor and timestamp; `companies.current_profile_revision_id` composite-FK to the same company. `PATCH /companies/:id/profile` honours `If-Match` (409 on mismatch). Snapshots are schema-validated on read.
- Assessment (`packages/content/src/assess.ts`): deterministic, no model call, always `mode: synthetic_demo`, versioned `contentVersion`; returns confirmed/unknown/missing fact keys, per-rule yes/no/unknown decisions with fact references, and a coverage block (`packStatus: research_pointers`, capabilities limited to information collection + official links). No numeric score anywhere.
- Checklist: items reconcile with each assessment (new → `suggested`, no-longer-applicable → `superseded`, completed items preserved). Transitions per plan §3A with role and evidence/reason requirements enforced in domain code and `expectedVersion` optimistic locking enforced by a DB trigger; `reviewer_verified` and `superseded` are terminal. Founders cannot verify (A13 groundwork).
- Official links: six directory URLs from docs/JURISDICTION_PACKS.md shown per market on formation items, each labelled "official directory · research pointer, not reviewed content".
- Preparation brief: `GET /companies/:id/exports/brief` renders printable HTML (facts with provenance, unknowns, unanswered, checklist with evidence, adviser questions, sources) marked **Unreviewed**, tied to revision version; audit event recorded.
- `pnpm seed:demo` seeds two synthetic tenants via the RLS-bound connection (refuses production).

Commands and outcomes (tested locally; no live model, no production deployment):

| Command | Outcome |
|---|---|
| `pnpm typecheck` | 5/5 packages pass |
| `pnpm lint` | 0 errors, 0 warnings |
| `PG_ADMIN_URL=… pnpm test` | 7 files, 39/39 pass on a fresh database (both migrations applied) |
| `pnpm db:migrate` | `0002_company_start.sql` applied to lex_dev; idempotent re-run |
| `pnpm seed:demo` | Two synthetic companies (NG pre-registration, GB operating) seeded; idempotent |
| `pnpm build` | Production build OK |
| `pnpm eval:legal` | Exit 1: no reviewed cases (denominator 0) |

Acceptance coverage:

- A01: unregistered NG startup → persisted revision, `prepare-registration` applicable with reason referencing recorded facts, CAC links, brief rendered (curl + browser).
- A02: registered GB business with evidence → registration rules `no`; superseded on regeneration rather than re-asked (unit + DB tests, seeded tenant B).
- A03: **Not sure** on legal form / regulated activity → stored `unknown`, listed under "Open unknowns", `licence-question` applicability `unknown`, no classification (unit, content, browser).
- A10: sign-out → sign-in shows revision 2, 13/20 answered, completed item with evidence intact.
- A14: tenant B gets 404 on A's profile, checklist item PATCH and brief; DB rejects forged `confirm_profile_revision` (`not authorised`).
- Transitions: skipping states → 422 `invalid_transition`; stale `expectedVersion` → 409 `version_conflict`; founder `reviewer_verified` → 422.

Browser evidence: `/companies/:id/overview` (current position, coverage, next steps, open unknowns), `/profile` (grouped adaptive form with Not sure/Skip, revision history), `/checklist` (transitions, evidence form, sources), brief opened in new tab. Desktop and mobile screenshots stored in the thread.

Mode: `synthetic_demo` labelled on assessment, checklist notice and brief. Legal-content version: `synthetic-starter-0.1.0` (not legal content).

Limitations: rules are generic preparation steps, not jurisdiction law; no statutory deadlines; no document upload for registration evidence (text assertion only); reviewer role exists in transitions but invites arrive in M6; assessment runs synchronously (deterministic, no job); brief is HTML only (no PDF/DOCX); Playwright E2E still pending.

Next task: M2 Content system (source/version registry, publication workflow, scoped rules/templates, draft packs).

### M2 Content system — 2026-09-21

Environment: Hoplite sandbox (Modal), Node v24.19.0, pnpm 10.26.0, PostgreSQL 16.14 local. Branch `feat/m2-content-system` stacked on `feat/m1-company-start` @ `fad816c` (PR #2 not yet merged).

Implemented:

- Domain (`packages/domain/src/content.ts`): platform roles (`content_editor`, `content_reviewer`, separate from company membership), source/source-version inputs (https only), data-only rule DSL (`applies` predicates → yes/no/unknown, reason templates with `{fact}` slots, mandatory `sourceSlugs`), template schema with declared `{{slots}}`, pack version content schema with cross-checks (rules/templates must cite sources present in `sourceRefs`; capabilities must be backed by rules/templates), reviewer evaluation case schema, pack state machine `draft → under_review → published → stale/withdrawn`.
- Database (`0003_content_system.sql`): `users.platform_role`, `sources`, `source_versions` (content hash, review state), `packs`, `pack_versions` (content hash, one published per pack), `pack_evaluations`. Trigger enforces: valid transitions; content frozen once out of draft; publication requires reviewer with `content_reviewer` role, reviewer ≠ author, and a passing evaluation on the **exact content hash**; publishing supersedes the prior published version to `stale`. RLS: founders read published/stale only; editors/reviewers read all; writes restricted by platform role. Checklist trigger relaxed so `superseded` items can be revived when content changes (only `reviewer_verified` is terminal).
- Content (`packages/content`): `evaluatePack` (outcome match + unacceptable-claim scan + uncovered rules), `assessProfile(facts, publishedPack)` → `mode: reviewed_pack` when a published pack is in scope (market + subdivision + matter type), otherwise `synthetic_demo`; `draftPackManifests` for all five markets with four reviewer cases each (normal ×2, missing information, out of scope) and explicit excluded topics.
- API (`/api/v1/content/*`): sources, source versions, source review, packs, draft versions, draft content edit, evaluate, transition. Reviewer-only for publish/stale/withdraw; author self-publish rejected in code and DB.
- UI: `/content` (packs, versions, source registry, role banner) and `/content/packs/:versionId` (scope, evaluations with hash match, rules, sources, actions). Company checklist/overview label reviewed vs synthetic content and flag a pack that became stale/withdrawn (A24).
- Scripts: `pnpm seed:content` (editor + reviewer synthetic users, sources, five draft packs; refuses production), `pnpm eval:legal` (runs all manifest cases, prints denominator, exits non-zero on failures). `db:setup` no longer rotates role passwords on an existing database; tests use per-run member roles.

Commands and outcomes (tested locally; no live model, no production deployment):

| Command | Outcome |
|---|---|
| `pnpm typecheck` / `pnpm lint` | 5/5 pass / 0 problems |
| `PG_ADMIN_URL=… pnpm test` | 9 files, 50/50 pass on a fresh database (three migrations) |
| `pnpm db:migrate` | `0003_content_system.sql` applied to lex_dev |
| `pnpm seed:content` | 5 draft packs, 6 sources, editor + reviewer users; idempotent |
| `pnpm eval:legal` | 20/20 reviewer-authored cases across 5 DRAFT packs; exit 0; prints "No pack is published… not evidence of legal correctness" |
| `pnpm build` | Production build OK |

Acceptance coverage:

- A05: market selection produces accurate capability state: `research_pointers` + information collection/official links without a published pack; `published` + reviewed checklist once a pack is published for that market and matter type.
- A06: no published pack → synthetic fallback labelled as such; no fabricated rules. Pack scoped to a subdivision the company is not in → fallback with explicit notice (unit test).
- A24: reviewer withdrew the NG pack → `findPublishedPack` returns null, regeneration falls back to `synthetic_demo`, prior checklist flagged; withdrawn is terminal (DB test + curl).
- Publication gate (curl + DB tests): editor publish → 403; reviewer publish from draft → 422 invalid transition; reviewer publish under review without evaluation → 422 `publication_gate`; failing evaluation or evaluation on another hash → still blocked; passing evaluation → published; founder as reviewer_id → rejected by trigger; content hash change after draft → rejected.
- Isolation: founder cannot see draft versions (RLS) or write sources (403/RLS); founder sees the version only after publication.

Browser evidence: reviewer signed in → `/content/packs/:id` (GB v1 under review) → Publish blocked with gate message → Run 4 reviewer cases (4/4) → Publish → status published, reviewer attributed. Desktop and mobile screenshots stored in the thread.

State left in the local demo database: GB formation starter v1 published (by the synthetic reviewer, after 4/4 cases); NG v1 withdrawn; US/EU/CN drafts. This is demo state, not legal review.

Limitations: draft rules are generic preparation steps citing landing pages only — no jurisdiction-specific sources, employment or supplier packs, or templates yet (`reviewed_template` capability schema exists but no template content); source versions store locators/permitted excerpts, not snapshots; evaluation cases live in the manifests rather than a reviewer-editable UI; no email notification to reviewers on stale/review-due; publish UI is functional but minimal (no diff view between versions).

Next task: M3 Documents and model path (private uploads, constrained parser, spans, queue jobs, provider adapter, evidence validation).
