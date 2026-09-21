# Hoplite handoff

## What is ready

This private repository contains the plan plus the M0 foundation scaffold (pnpm workspace, migrations, web, worker, tests, CI). `.hoplite/settings.json` defines the sandbox setup and run scripts. No application secrets or deployed services exist; see docs/STATUS.md for verified state.

Official Hoplite material describes connecting GitHub repositories, running agents in isolated development environments and reviewing managed previews/diffs: https://www.usehoplite.com/ and https://www.usehoplite.com/about (checked September 21, 2026). Account access, subscription limits, exact settings screens and production hosting were not verified. Do not invent a Hoplite configuration file or API.

## Setup

1. Connect GitHub in Hoplite and grant its installation access to **only this repository** as appropriate. A newly created private repo may need explicit installation access. Do not change it to public to make connection work.
2. Select `adetorojeremiahfadesayo/lex-company-counsel` and the `main` branch. Start the implementation task with the prompt below; use a feature branch for reviewable changes.
3. Let the agent inspect the sandbox runtime, choose compatible stable dependencies and commit a lockfile. It should implement the scripts below as part of M0 before claiming they work.
4. Create a dedicated development Supabase project or an equivalent configured local stack. Supply values from .env.example using the platform's private environment/secret mechanism. Do not paste credentials in a GitHub issue, commit or shared prompt.
5. Select an LLM provider and actual available model ID; configure the adapter and secret. Provider remains open to your choice. Until then, synthetic mode can support UI development but must be visibly labelled.
6. Configure the preview process to bind to `0.0.0.0` and the platform-provided port. Run a persistent worker alongside the web process; long analysis must not depend on a request remaining open. Use Hoplite's available preview mechanism rather than guessing URL formats.
7. Review preview evidence and the status file at each milestone. Authorise production hosting separately after the working preview is accepted.

### Scripts the scaffold must implement

| Script | Contract |
|---|---|
| pnpm dev | Start web bound to configured host/port |
| pnpm dev:worker | Start durable worker |
| pnpm lint | Static code checks |
| pnpm typecheck | Strict TypeScript validation |
| pnpm test | Domain and integration tests; report skipped external-service tests |
| pnpm test:e2e | Playwright acceptance journeys against configured preview |
| pnpm build | Production compilation |
| pnpm db:migrate | Apply versioned SQL migrations to explicitly selected environment |
| pnpm seed:demo | Idempotently seed synthetic tenants only; refuse production |
| pnpm eval:legal | Evaluate reviewed cases, record denominator and unsupported claims |

Status after M0: `dev`, `dev:worker`, `lint`, `typecheck`, `test`, `build`, `db:migrate` and `db:setup` are implemented and were run locally. `test:e2e` is configured but has no journeys yet. `seed:demo` seeds two synthetic tenants (M1). `eval:legal` exits with an explicit not-implemented message.

## Paste-ready implementation prompt

```text
Build the application described in this repository. First read AGENTS.md,
IMPLEMENTATION_PLAN.md, docs/JURISDICTION_PACKS.md, docs/ACCEPTANCE_TESTS.md,
docs/BACKLOG.md and docs/STATUS.md.

This is a personalised legal/compliance workspace for startups and solo
businesses. Preserve the entire agreed journey: adaptive company profile,
current-position assessment, registration/readiness checklist, employment,
supplier/commercial and other matters, create-or-upload agreements,
company-aware explanations, reviewer collaboration, and confirmed company
memory. Do not reduce it to a chatbot, document summariser or lawyer intake form.

Target Nigeria, UK, US, European countries and China through versioned
jurisdiction/matter packs. All intended markets can be selected, but supported
guidance must reflect reviewed coverage. No invented legal rules, sources,
approval labels or global compliance scores.

Start with M0 and progress through M7 in dependency order. This repository
currently contains only planning documents. Scaffold the stack, migrations,
tests, package scripts and provider interfaces. Use the stated architecture
unless a concrete platform constraint requires a documented equivalent.
Make one authenticated persisted vertical slice work before expanding.

Use two synthetic companies to prove that recommendations change with confirmed
company context and that data never leaks between tenants. Enforce authorisation
in server/database/storage/jobs/exports. Parse and validate model output and
evidence. Fail visibly when models or document processing fail; no silent canned
success. Suggestions cannot alter confirmed company facts or approvals.

If model keys are unavailable, continue independent implementation and clearly
label synthetic demo mode. If legal review is unavailable, keep content packs
draft/limited and implement the reviewer workflow; do not fabricate approval.
Report the exact blocked dependency without stopping unrelated build work.

Inspect the actual preview on desktop and mobile, exercise every core journey,
and run the meaningful acceptance suite. Record commands, outcomes, commit,
live-versus-demo status and remaining blockers in docs/STATUS.md. Return a
reviewable branch or PR and preview evidence. Do not change repository visibility,
reuse the previous Compliance-AI-Scanner app, or publish production resources.
```

## Production portability

Hoplite preview does not establish permanent hosting. Proposed production services: web container, worker container, managed Postgres/auth/storage and configured model provider. Use separate staging/production credentials, migrations and backups. Expose health checks; terminate HTTPS through the host/reverse proxy. Never use ephemeral disk for company documents.

Before enabling real documents: verify region and provider data handling, access isolation, deletion behaviour, reviewer assignment, restore procedure, usage limits and legal content coverage. Estimate hosting/model cost from measured demo runs; do not invent a monthly price.

Technical references checked September 21:
- https://nextjs.org/docs/app/guides/self-hosting
- https://docs.docker.com/guides/nextjs/
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/buckets/fundamentals
