# Lex Company Counsel

Working name for a company-specific legal and compliance workspace for startups and solo businesses.

The product learns the company's confirmed context, assesses its starting position, explains next steps, and supports employment, supplier/commercial, and other business matters as the company grows. Lawyer review is part of this continuing workflow, not the entire product.

**Status (25 September 2026):** Company onboarding, profile, checklist, three matter paths, private TXT/DOCX/text-PDF uploads, contextual preparation analysis, editable draft outlines, action items and printable lawyer packets work locally. Sign-in and sign-out screens have been removed; each browser receives an isolated guest workspace. A live OpenAI or Anthropic model adapter is implemented but has **not** been exercised with a real key. Legal packs remain unreviewed, and this is not a production legal service. See [docs/STATUS.md](docs/STATUS.md).

## Local development

```bash
pnpm install
source scripts/dev-env.sh   # Linux/Hoplite: starts Postgres, applies migrations, exports DB URLs
pnpm dev                    # web on http://localhost:3000
PG_ADMIN_URL=postgres://postgres@localhost:5432/postgres pnpm test
```

For other environments, create the database and `lex_app` role with `pnpm db:setup`, then set `DATABASE_URL` and `APP_DATABASE_URL` in `apps/web/.env.local` (copy `.env.example`). The web server needs the RLS-bound `APP_DATABASE_URL`; the privileged URL is used for migrations. In production, use managed PostgreSQL and persistent backups. Documents are stored privately in PostgreSQL rather than an ephemeral app filesystem.

Set `LLM_PROVIDER=openai` or `anthropic`, `LLM_MODEL` and `LLM_API_KEY` server-side to enable a live model call. The user must opt in to external processing per analysis. With no key, the app visibly runs local preparation questions instead. Provider failure is recorded as failure and does not masquerade as a successful analysis.

## Start here

1. [Implementation plan](IMPLEMENTATION_PLAN.md) — agreed scope, UX, architecture, schema, API, AI contracts and delivery order.
2. [Hoplite handoff](docs/HOPLITE_HANDOFF.md) — repository connection, configuration and paste-ready build prompt.
3. [Jurisdiction and content policy](docs/JURISDICTION_PACKS.md) — target markets, source review and honest coverage.
4. [Acceptance tests](docs/ACCEPTANCE_TESTS.md) — measurable completion requirements.
5. [Delivery backlog](docs/BACKLOG.md) — tasks, dependencies and evidence.
6. [Status](docs/STATUS.md) — update after every completed milestone.

## Product path

Company profile → current-position assessment → personalised starting checklist → employment, supplier/commercial or other matter → create or upload a document → context-specific explanation and suggested next actions → optional professional review → confirmed company-record update.

Target markets: Nigeria, the UK, the US, European countries and China. The application must distinguish selecting a market from having reviewed guidance for that market and matter type.

Development platform: Hoplite. Current stack: TypeScript, Next.js and PostgreSQL with row-level security. The separate job worker remains in the repository for existing jobs; matter analysis currently runs in a server request. Production hosting and LLM provider remain configurable.

## Boundaries

Do not claim a licensed lawyer, attorney-client relationship, guaranteed legal compliance, complete regional coverage, or verified production behaviour merely from generated text or passing builds. Founder guidance should remain useful and personalised, with exact sources and clear next steps. Human review is required for publishing legal content packs and releasing professional approvals; ordinary explanations do not require an approval modal at every step.

This repository is intended to remain private. Do not copy the previous Compliance-AI-Scanner implementation or ArbLex proposal into the product. New core implementation is required for the intended LexHack entry. No open-source licence has been selected.
