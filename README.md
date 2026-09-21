# Lex Company Counsel

Working name for a company-specific legal and compliance workspace for startups and solo businesses.

The product learns the company's confirmed context, assesses its starting position, explains next steps, and supports employment, supplier/commercial, and other business matters as the company grows. Lawyer review is part of this continuing workflow, not the entire product.

**Status: implementation plan only. No application, live legal guidance, or deployment exists in this repository yet.**

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

Development platform: Hoplite. Proposed stack: TypeScript, Next.js, PostgreSQL, Supabase Auth/Storage, and a durable worker. Production hosting and LLM provider remain configurable.

## Boundaries

Do not claim a licensed lawyer, attorney-client relationship, guaranteed legal compliance, complete regional coverage, or verified production behaviour merely from generated text or passing builds. Founder guidance should remain useful and personalised, with exact sources and clear next steps. Human review is required for publishing legal content packs and releasing professional approvals; ordinary explanations do not require an approval modal at every step.

This repository is intended to remain private. Do not copy the previous Compliance-AI-Scanner implementation or ArbLex proposal into the product. New core implementation is required for the intended LexHack entry. No open-source licence has been selected.
