# Delivery backlog

All tasks begin NOT STARTED. Owners are roles to assign, not assumed team members. Do not fan out agents automatically; these tasks also work sequentially.

| Milestone | Tasks | Depends on | Owner | Exit evidence |
|---|---|---|---|---|
| M0 Foundation | Scaffold TypeScript web/worker, lockfile, scripts, env validation, auth, migrations, company membership, RLS, health endpoints, CI | None | Engineering | Two isolated tenants; clean migration; build/typecheck; A14/A23 |
| M1 Company start | Adaptive intake, profile revisions/provenance, assessment, checklist transitions, official links, preparation export | M0 | Product + legal | Persisted initial journey; A01–A03/A10 |
| M2 Content system | Source/version registry, publication workflow, scoped rules/templates, draft packs for all target markets | M0 | Legal + engineering | One reviewed capability with test cases; A05/A06/A24 |
| M3 Documents and model path | Private uploads, constrained parser, spans, queue/retry/cancel, provider adapter, evidence validation | M0 + initial M2 | Engineering + AI | One real file-to-finding live path; A08/A16–A20 |
| M4 Matter experiences | Employment create/review, supplier create/review, Other triage, contextual questions and editable drafts | M1–M3 | Product + AI | All entry paths work; A04/A07–A09 |
| M5 Continuing company workspace | Proposed memory changes, confirmations, stale detection, task tracking, history and company chat retrieval | M4 | Engineering + product | A10–A12; no silent fact updates |
| M6 Review and export | Scoped invites, reviewer workspace, bound approvals, document deletion, source-aware exports | M4 + M5 | Engineering + legal | A13–A15/A21/A22 |
| M7 Release evidence | Reviewed content expansion, legal benchmark, all critical tests, mobile/desktop QA, restore/usage checks, walkthrough and deployment handoff | M0–M6 | Whole team | Test report, live/demo provenance, preview evidence, stated limits |

M1 can use explicitly synthetic rules while M2 is being reviewed. M3 model calls must not be falsely described as live when keys are absent. Do not wait for global content completeness before proving persistence and workflow.

## Implementation order within each milestone

1. Add or extend typed contracts and migrations.
2. Implement server authorisation/state transitions.
3. Add the UI and real persisted integration.
4. Implement meaningful regression and acceptance tests.
5. Inspect preview and record actual evidence.
6. Commit a coherent change and update STATUS.md.

## Required CI after scaffold

Lockfile-based install, lint, strict typecheck, unit/domain tests, production build. Integration suite uses an isolated test database with migrations and RLS enabled. E2E uses synthetic test accounts. Live provider tests are explicit opt-in checks with secrets, not mandatory on every untrusted PR. Never print secrets to CI output.

## Keep deferred

Automatic government submission; multi-party signature; billing; third-party negotiation; broad integrations; every industry; all European countries' laws; OCR beyond a proven parser; professional credential verification automation. Keep extension points without showing these as finished features.
