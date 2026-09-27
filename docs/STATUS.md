# Implementation status

Updated: 2026-09-27 (matter review improvements deployed to Render). Historical milestone notes below describe their state at the time; this section is current.

Codex is now the development tool; Hoplite references in the historical milestone notes record earlier work. The current submission and UI review is in [CODEX_BUILD.md](CODEX_BUILD.md).

### Current implementation — 2026-09-27

- **Brand and UI:** Product name is Clex, with Clexa as an original illustrated guide. The landing page gives a single demo action, an animated document scene, and a clear founder journey; the company overview and matter page show contextual Clexa prompts. Motion has a reduced-motion fallback. The public Render hostname and private repository slug remain historical deployment identifiers until a safe rename is verified.

- **Live preview:** [lex-company-counsel.onrender.com](https://lex-company-counsel.onrender.com/) runs on Render's free web service and free PostgreSQL in Virginia. After PR #12, `/api/ready` returned HTTP 200 with database ready, six migrations and `no_model_configured`. Fresh synthetic browser QA verified page-by-page profile completion, one-page-at-a-time registration answers, saved company memory, local contract review, company-specific reasons, side-by-side conversation/document evidence, persistent chat after reload, draft-with-open-findings status, and stale-review status after a source was added. A live model call remains unverified. The free database expires 26 October 2026; this is a disposable demo.
- **Judge demo:** The homepage’s **Click demo answers** action creates a synthetic Clex Demo Bakery and opens its company questions; each demo button fills only the active question page, which the judge reviews before advancing. After saving the profile, the registration workspace fills one active detail page at a time. From the compliance dashboard a judge can open a supplier matter and add synthetic Slack and contract sources to see local excerpt-based findings and a working draft. Existing browser workspaces remain in place. Two separate HTTP cookie sessions received different company IDs; repeating the action in one session reused its company; cross-session access to the first overview returned 404. A live model call remains unverified.

- **End-user account screens removed.** Opening the site creates an isolated guest identity and secure cookie session automatically. No sign-in or sign-out routes remain. Data remains tied to that browser session; clearing cookies or session expiry loses access because recovery is not implemented. This is acceptable for a private hackathon preview, not a production account model.
- **M3/M4 usable path:** company profile and checklist lead to employment, supplier and other matters. Each matter keeps its own context, private TXT/DOCX/text-PDF files (10 MB, PDF page limit), extracted text, analyses, editable draft outlines, action items, tenant-scoped chat history and printable lawyer packet. Uploads live in PostgreSQL bytea under tenant RLS. Deleting any source removes matter analyses, drafts and saved chat excerpts so removed source text does not linger in derived content.
- **Contextual analysis:** with no model credentials, a labelled local preparation run identifies missing inputs and points to actual excerpts where found. It checks payment, termination and governing-law wording, plus supplier scope, liability and data handling or employment work-product ownership. These are prompts for review, not legal conclusions. A server-side OpenAI Responses/Anthropic Messages adapter exists and requires explicit per-run consent; model output is schema-validated and document excerpts must be exact substrings. Provider failure persists as failed, with no silent fallback. No live provider request has been verified.
- **Review boundary:** packets and drafts are explicitly unreviewed. No attorney approval, verified legal advice, reviewed employment/supplier templates, reviewer invite flow, durable analysis queue, OCR, or account recovery yet. The five jurisdiction packs remain draft/research pointers until a distinct qualified reviewer validates and publishes them.
- **Local evidence:** PostgreSQL migrations `0001`–`0006` applied in CI; existing PostgreSQL integration suite passes, including cross-tenant matter/file isolation, derived-data deletion, exact excerpt checks and rejection of fabricated model quotations. Strict typecheck, lint and production build pass locally and in CI. A rendered local browser journey created a company/profile/employment matter, uploaded TXT, DOCX and text PDF files, produced local context-specific findings and a draft outline, and opened the printable packet. Supplier and other matters were also created and analysed locally. The first PDF attempt exposed a bundling error; marking the parsers server-external fixed it and the second upload extracted text successfully.
- **Next before submission:** configure and verify one real model call; lawyer review and publish an initial narrow pack (or clearly demo limited coverage); finish file/parser abuse limits and deployment backups; capture walkthrough and submit. Do not describe these as finished.

### Matter review and demo flow — 2026-09-27

- PR #12 (`f1356b0`) added tenant-scoped saved conversation turns; a visible list of confirmed company facts in the matter workspace; a reason on each finding explaining its connection to the company; and a side-by-side evidence view for a mismatch between a conversation and a contract.
- Drafting a response no longer clears open findings. Reviews are marked stale when a newer source is added and remain so until another check runs. Deleting any source removes all analysis, draft and saved-chat derivatives for that matter.
- The registration demo button now fills only the active form, leaving it readable and editable before the user saves. A successful save advances to the next incomplete registration task.
- Live preview QA on Render verified that the synthetic profile persisted through five question pages; registration names, founders and address each advanced only after save; a synthetic supplier matter showed Nigeria/Lagos/food-business facts; two Slack/contract mismatches displayed exact excerpts from both sources; chat and draft survived reload; the draft left the matter at `Needs attention`; and adding another conversation changed the dashboard message to require a new check. Synthetic data only; no live model call.
- CI for PR #12 passed: lint, typecheck, PostgreSQL-backed test suite, migration deployment and production build. The deployed readiness endpoint reported six migrations and `no_model_configured`.

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

### UI refresh: Try it out + demo answers — 2026-09-26

- Removed the one-click synthetic demo (`POST /api/demo`, `StartDemoButton`). The landing hero now has **Try it out** (`/companies/new`) with **Click demo answers** (`/companies/new?demo=1`) under it.
- Demo answers mode: the new-company form prefills "Clex Demo Bakery" and goes to `/companies/:id/profile?demo=1`. Each intake question shows a clickable demo answer (`apps/web/src/lib/demo-answers.ts`), with **Pick all demo answers** for unanswered questions. Nothing is saved until the user confirms, which creates a normal profile revision. The profile page offers the same toggle to any company.
- Removed the AI-style decoration (hero glows, orbit, sparkle badge, "Clexa found…" copy). Colours, tokens and Clexa are unchanged. Restyled the new-company, profile and intake pages with Clex tokens: pill choices instead of selects, state pills, a progress bar and a sticky save bar.

| Command | Outcome |
|---|---|
| `pnpm typecheck` / `pnpm --filter @lex/web lint` | pass / 0 problems |
| `pnpm test` | 11 files, 56/56 pass |
| Browser (1440×900, 390×844) | landing → Click demo answers → create → Pick all → save → revision 1 (18 answers); adaptive follow-ups show demo answers → revision 2, 20/20, 1 Not sure; no horizontal overflow on mobile |

This entry recorded local validation before deployment; see the live verification below.

### One-page company workspace — 2026-09-26

- `/companies/:id/overview` is now the single workspace: a hero with a progress stepper and Clexa's contextual tip, step 1 (intake questions, which collapse to fact chips once saved), step 2 (contract check: paste or use the sample agreement → creates a supplier matter, uploads the text and runs the existing analysis API; findings, lawyer questions and the lawyer packet appear inline), and a sticky checklist sidebar.
- Checklist sidebar: tapping a circle walks the item through the allowed founder transitions to `user_completed`, recording evidence "Marked done by the founder from the checklist." Tapping again returns it to `in_progress`. Reviewer-verified items and reviewer role are read-only. Skip, block and evidence options remain on `/checklist`.
- Intake follow-up questions (region, worker locations) now appear as soon as the answers they depend on are picked, so one save completes the profile. `/profile` redirects into the workspace.
- The landing **Click demo answers** button creates the demo company directly (shared server action `app/companies/new/actions.ts`); answers are still picked by the user.

| Command | Outcome |
|---|---|
| `pnpm typecheck` / `pnpm lint` | pass / 0 problems |
| `pnpm test` (with `scripts/dev-env.sh`) | 11 files, 56/56 pass |
| Browser 1440×900 | landing → Click demo answers → Pick all → Save (20/20, 1 Not sure, revision 1, 6 checklist items) → tap circle (1/6) → sample agreement → Check (6 findings, lawyer packet link); undo circle → 0/6. Scripted run took 15 s |
| Browser 390×844 | no horizontal overflow; checklist shown above the steps once built |

This entry recorded local validation before deployment; see the live verification below.

### Lex PR #7 and Render preview — 2026-09-26

- Resolved the duplicated Hoplite commit history by merging current Lex `main` into PR #7 while keeping the tested one-page workspace tree. PR #7 merged as `3886943`; `main` and Render's `feat/complete-product` branch were advanced together.
- GitHub CI passed with its database-backed checks. Local `pnpm build` and `pnpm lint` passed; local `pnpm test` passed 26 tests and skipped 30 database tests because `PG_ADMIN_URL` was not set.
- Render reported a successful deployment of `3886943`. A fresh-browser run at `https://lex-company-counsel.onrender.com/` created Clex Demo Bakery through **Click demo answers**, picked and saved 20/20 answers (one Not sure), generated six checklist items, marked one complete, and checked the synthetic flour agreement. The workspace showed six findings and a lawyer-packet link. This run used a fresh browser session and did not alter an existing user's trial company.

### Full journey and UI overhaul — 2026-09-26

User feedback: the progression got stuck, there was no payoff after the checklist, and the user wanted a downloadable pack, a post-registration hub with agent workflows, and a new visual direction (Notion, Raycast and Comp AI references).

- Fixed: on short viewports the sticky save bar covered "Pick all demo answers", so a tap landed on Save with nothing picked. The intake is now a step-by-step wizard (one group per screen, Back/Next, then Review, then Save). The sticky bar is gone.
- Journey: Answers → Checklist (tap-to-complete sidebar) → **Registration pack** (`/companies/:id/registration`: PDF download via `GET /api/v1/companies/:id/exports/registration-pack` built with pdf-lib, success screen with confetti, optional "I'm registered" which saves `registration_status` and `registration_number` as a founder-confirmed profile revision) → **Run your company** (`/companies/:id/run`, 7 module cards).
- Agent workspace (`/companies/:id/matters/:matterId`): sources (document upload, Slack/Gmail conversation import by paste or export file, synthetic demo samples), a chat agent (`POST …/matters/:matterId/agent`) with browser voice input and read-aloud (Web Speech API, shown only when supported), and an editable draft (save new version, download .txt, copy). Local mode compares conversations against documents (numbers and places) and runs the existing clause checks. It quotes only supplied text, saves findings as a matter analysis and saves letters as a matter draft. Live mode uses the configured provider with schema and quote validation. Failures return an error with no canned output.
- Not implemented: OAuth Slack/Gmail connectors (they need app credentials; the UI says so and offers import instead). The chat transcript itself is not persisted; findings and drafts are.

| Command | Outcome |
|---|---|
| `pnpm typecheck` / `pnpm lint` | pass / 0 problems |
| `pnpm test` (with `scripts/dev-env.sh`) | 12 files, 60/60 pass (new `apps/web/test/agent.test.ts`) |
| `pnpm --filter @lex/web build` | compiled successfully |
| Browser 1440×900 | landing → demo → pick all → save (6 items) → 6/6 → pack page → PDF 200 `application/pdf` → success → registered → hub (7 cards) → Contracts → sample Slack + document → 2 mismatch findings + letter to "Demo Flour Co" |
| Browser 1280×577 | wizard pick all + save works (the previous blocker) |
| Browser 390×844 | workspace, pack, hub and agent fit the viewport |
| PDF | 2 pages, rendered and inspected |

Tested locally only at the time of this entry. Deployment status is recorded below after integration.

### Card-agent integration and live preview — 2026-09-26

- Ported Hoplite commit `1b0df52` onto current Lex main, retaining the earlier deployment record in this file. PR #8 passed CI and merged as `ba93e5b`; Render's `feat/complete-product` branch was advanced to the same commit. Render reported deployment success.
- Local `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm lint` passed. Local `pnpm test`: 30 passed, 30 database tests skipped without `PG_ADMIN_URL`; GitHub CI passed its database-backed suite.
- Fresh-browser live check: **Click demo answers** → **Pick all demo answers** → review and save 20 answers → six checklist items → registration-pack PDF downloaded with success screen → **Run your company** displayed seven cards → Contracts card opened its agent → synthetic Slack thread and supplier agreement imported → agent reported the payment and governing-law mismatches and saved editable draft v1. The live agent labelled itself **Local rules · no model configured**. A 390×844 mobile screenshot of the hub and agent source panel was inspected. The test created a separate synthetic company and did not alter an existing trial.

### Two-phase workflow: registration → compliance — 2026-09-26

User feedback: the checklist only supported manual ticking and mixed registration with running-the-company items. After the pack download, the next phase should be running compliance.

- **Phase 1, Registration** (`/overview`): 7 steps that complete from real actions only. Company questions; proposed names, founders and shares, and registered address (new fact keys `proposed_names`, `founder_details`, `registered_address`, saved as versioned profile revisions); legal form; pack download (derived from the `export.registration_pack` audit event via new `hasAuditAction`); certificate upload (document on a `topic: registration` matter plus `registration_status = registered`). The pack locks until the four details are saved. There is no manual ticking.
- **Pack PDF** now leads with the registration details, then company facts, lawyer questions, and the compliance areas to set up after registration.
- **Phase 2, Compliance** (`/run`; registered companies are redirected here): compliance health (% of tasks done), status counts, 7 areas each with 4 tasks derived from real data (document uploaded, conversation imported, agent check run, response drafted). The status is *Needs attention* when the latest agent check has open issues and no newer draft. Starter-rule items (licence, hiring, supplier and data rules) appear as "From your answers" hints on the matching card. The calendar shows placeholder dates at 3, 6, 9 and 12 months from the recorded registration date, plus deadlines quoted from the user's conversations, and is labelled as not legal deadlines.
- Each area page shows its task strip, which updates after every agent action.
- The rule-based tap-to-complete sidebar was removed. `/checklist` remains for the legacy transitions.

| Command | Outcome |
|---|---|
| `pnpm typecheck` / `pnpm lint` | pass / 0 problems |
| `pnpm test` (with `scripts/dev-env.sh`) | 13 files, 64/64 pass (new `apps/web/test/workflow.test.ts`) |
| `pnpm --filter @lex/web build` | compiled successfully |
| Browser 1440×900 | demo → answers → 2/7 → one form saved (3/7) → fill all demo (5/7) → pack PDF → success → sample certificate → "You're registered!" → dashboard 0%, 7 not started, 6 calendar entries → Contracts: sources + check = Needs attention → draft = In order → dashboard 14% |
| Browser 390×844 | dashboard, registration and pack pages fit (the only overflow is the fixed confetti canvas) |
| PDF | 2 pages; registration details section rendered and inspected |

Tested locally only at the time of this entry. Deployment status will be recorded after integration.

### Two-phase integration and Render verification — 2026-09-27

- Ported Hoplite commit `9d65441` onto current Lex main through PR #9, merged as `96bc6a8`, and advanced Render's `feat/complete-product` branch to the same commit. GitHub CI and Render deployment passed.
- Local `pnpm build` and `pnpm lint` passed; `pnpm test` passed 34 tests and skipped 30 database tests without `PG_ADMIN_URL`. CI ran the database-backed checks.
- Fresh-browser live check: demo intake saved 20 answers → registration details reached 5/7 → registration pack PDF downloaded → sample certificate and registration number completed Phase 1 → Phase 2 showed seven compliance areas and a calendar explicitly labelled as placeholder dates. A 390×844 screenshot of the dashboard was inspected. This synthetic company was separate from existing trial data.
- Corrected landing-page copy to describe action-based registration, and labelled the percentage on the dashboard as tracked task progress rather than a legal compliance score.

### Page-by-page judge demo — 2026-09-27

- PR #10 replaced the intake's all-at-once demo shortcut with **Fill this page with demo answers** on each of five question pages. The button leaves the page open for reading and editing. It also fills conditional questions revealed on that page, such as the state field after Nigeria is selected. The judge advances with **Next**, reviews the visible answers, then saves.
- The first live run found that the last **Review answers** click could submit the form after the control changed to **Save company answers**. PR #11 gave those controls separate DOM identities and prevented the Review click's default form action; it also corrected outdated judge and Clexa guidance.
- `pnpm build`, `pnpm lint`, and `pnpm typecheck` passed locally; `pnpm test` passed 34 tests and skipped 30 database tests without `PG_ADMIN_URL`. Both PRs passed GitHub CI, including the database-backed checks. Render reported success for commit `787bc78`.
- A fresh-browser live run at `https://lex-company-counsel.onrender.com/` filled pages 1–5 separately (answer counts 2, 6, 10, 14, 19), with manual Next each time. The Nigeria answer revealed and filled the Lagos state field. Review stayed open after a pause and showed 19 visible answers; **Save company answers** then advanced to registration details (2/7). A 390×844 screenshot of the review layout was inspected. This created a separate synthetic company and did not alter an existing trial.
