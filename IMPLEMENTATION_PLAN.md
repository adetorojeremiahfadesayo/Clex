# Implementation plan

Version 1 — 2026-09-21. User-approved product direction; engineering choices below are implementation defaults, not claims of existing functionality.

## 1. Outcome and scope

Build an ongoing company-specific legal/compliance assistant for founders and solo businesses. It must understand the business before recommending steps, guide formation and readiness, then support everyday agreements and questions using persistent confirmed context. The founder receives useful explanations directly; professional review is an available escalation and collaboration path.

Personas: solo founder, startup operator, invited team member and legal reviewer. A legal content editor is a separate administrative role. No assumption that the current reviewer is qualified in every intended jurisdiction.

### 90-second demonstration

0–20 seconds: create a synthetic company; select jurisdiction, industry and stage. Show different follow-up questions for an unregistered business and an existing company.

20–35: show a prioritised starting checklist, why each item applies, official links and a downloadable lawyer preparation brief. Confirm one completed item with evidence.

35–65: choose employment or supplier agreements. Upload a seeded agreement. Show an exact clause, its significance for this company's facts, a missing piece of context and a targeted question. Compare with a second company's profile to prove recommendations differ substantively.

65–80: open a proposed revision or template-based draft, then a reviewer view. The reviewer changes one suggestion; preserve the change and attribution.

80–90: return to the company dashboard. Show the newly confirmed fact, next action, document version and saved history. Show limited coverage honestly when switching to an unreviewed jurisdiction.

### Release scope

All first-release paths: adaptive onboarding; saved company profile; current-position assessment; registration/readiness checklist; three matter entry points; create/upload choices; source-linked explanations; follow-up questions; editable drafts; action tracking; reviewer workspace; versioned company memory; exports.

Initially exclude automatic filings, payments, e-signature, negotiation with third parties, employment termination decisions, court/tribunal work and unrestricted legal advice across every field. These are product depth cuts, not removal of the main company lifecycle.

## 2. Company context

Collect progressively, with Save and resume, Back, Not sure and Skip where safe. Never equate missing answers with false.

| Group | Fields |
|---|---|
| Identity | Business/trading name, stage, legal form if known, registration status and evidence |
| Geography | Formation country and subdivision; operating locations; worker locations; customer markets; document governing law |
| Business | Industry, plain-language activities, goods/services, B2B/B2C, regulated activity indicators |
| People | Founders/owners, employee and contractor counts, hiring plans; minimise personal data |
| Operations | Suppliers, customer data categories, online sales, existing advisers, current priority |
| Documents | Document type, date, parties, status, language, governing law as extracted and confirmed |

Use explicit field provenance: user_asserted, extracted_unconfirmed, user_confirmed, reviewer_confirmed. Include source document/version and confirmation time. User-confirmed is not equivalent to government-verified. Persist profile revisions and permit corrections.

The assessment yields confirmed facts, missing facts, prioritised next steps and coverage gaps. Do not output a universal numeric 'legally compliant' score. Readiness progress is completed applicable checklist items, with a visible denominator and outstanding unknowns.

## 3. Screens and journeys

### A. Getting started

Routes: /, /companies/new, /companies/:id/overview, /companies/:id/profile, /companies/:id/checklist. The 25 September build removes end-user sign-in/sign-out and creates an isolated browser workspace automatically; see docs/STATUS.md for the resulting recovery limitation.

Onboarding branches by status, activities and locations. An unregistered business receives an appropriately scoped registration preparation path. A registered company can skip completed formation steps and upload evidence. Where a legal form is uncertain, explain options from reviewed content and gather facts; do not silently choose an entity type.

Checklist item anatomy: action; reason this applies; relevant company facts; authoritative source and checked date; prerequisites; information/documents to gather; official destination link; owner; due-date basis if verified; status; optional reviewer request. Never invent statutory deadlines.

Task states: suggested → accepted → in_progress → evidence_submitted → user_completed or reviewer_verified. Also dismissed_with_reason, blocked and superseded. Only the proper actor can make each transition. User self-completion remains visibly distinct from reviewer verification.

Formation completion triggers an assessment refresh on the confirmed profile revision. Employment/supplier paths remain accessible when relevant; registration is not a universal UI lock.

### B. Employment and hiring

/companies/:id/matters/new?type=employment offers Create a draft or Review an existing document. Ask worker location, intended role, arrangement, work pattern, payment terms and known governing law. Uncertain worker classification becomes a review question, not an automatic legal determination.

Draft from reviewed jurisdiction/matter templates and answered variables. Explain sections, flag unfilled fields, and let users edit. Existing contracts retain originals, extracted clauses, suggested changes and reasons. Show what requires reviewer attention separately from ordinary explanation.

### C. Supplier and commercial agreements

Capture the company's role (buyer/supplier), transaction purpose, deliverables, payment structure, relevant data access and locations. Review extracted clauses against a versioned playbook. Suggestions must reference both actual clauses and relevant confirmed company facts. Missing clauses are reported with extraction coverage; unreadable text is not proof a clause is absent.

### D. Other business matters

Accept a question, meeting note or document. Classify into known supported matter types, ask clarifying questions and create a matter record. Unsupported subjects produce an organised summary, missing-information questions and reviewer referral without invented jurisdiction-specific conclusions. Meeting discussion does not prove a resolution was adopted.

### E. Persistent workspace

Routes: /companies/:id/matters, /matters/:id, /documents/:id, /actions, /review, /settings.

Every matter has timeline, linked documents, confirmed context snapshot, questions/answers, findings, draft versions, reviewer comments and actions. Company chat can refer to these records, but is not the sole navigation or workflow engine.

### F. Review and export

Reviewer can annotate, ask follow-ups, reject/amend suggestions and approve a specific version within assigned scope. Do not permit self-assignment of a professional reviewer role. Founder can export their own draft clearly labelled unreviewed; professional approval labels require reviewer action.

Exports: company preparation brief, checklist, matter report and draft agreement. Include company/document versions, factual provenance, source references, open questions and approval state. Produce printable HTML/PDF first; DOCX export after core flow works.

## 4. Multi-jurisdiction strategy

All requested markets are selectable and retained in context. Coverage is per jurisdiction + subdivision + matter type + rule/template version, not one global country toggle. Europe is a region selector leading to a country. UK jurisdiction and US state/local applicability must be captured when relevant. Mainland China, Hong Kong and other distinct legal scopes must not be conflated.

See docs/JURISDICTION_PACKS.md for publication gates. Expand reviewed scope as far as the team can evidence; never imply all countries are supported because their flags render. The UI remains useful in limited scopes through fact gathering, official directories and review preparation.

## 5. Architecture and deployment

Default: a TypeScript monorepo with Next.js web/server, PostgreSQL, Supabase Auth and private Storage, and a separate Node worker using a durable database-backed job queue. Use Zod for request/model contracts, SQL migrations, Vitest for logic, Playwright for rendered workflows. Pin supported versions at scaffold time.

```
Browser -> authenticated Next.js API -> Postgres (RLS)
                     |-> private object storage
                     |-> durable job queue -> worker
                                              |-> document parser
                                              |-> approved-source retrieval
                                              |-> LLM adapter
                                              |-> schema/evidence validation
                                              |-> persisted findings + events
```

Do not split every model step into a microservice. An orchestrated pipeline with typed stages is sufficient. Provider adapter allows model choice without changing domain logic. No model keys in the browser. Start with full-text/metadata retrieval; add vectors only after retrieval evaluation shows benefit. Select an embedding model and dimensionality together if vectors are added.

Codex is the current development tool. Production defaults can be Next.js on a container-capable host, a persistent worker, managed Postgres/auth/storage and server-side model credentials. A local Codex preview is not production hosting. See docs/CODEX_BUILD.md for the current submission path; docs/HOPLITE_HANDOFF.md records the earlier platform handoff.

Proposed layout (create during implementation):

```
apps/web/              routes, server APIs, user interfaces
apps/worker/           parsing and generation jobs
packages/domain/      schemas, applicability rules, state transitions
packages/ai/          provider interface, prompts, validation
packages/content/     source packs, approved templates, playbooks
packages/testing/     synthetic fixtures, legal benchmark cases
supabase/migrations/  tables, RLS, indexes, constraints
tests/e2e/            full rendered journeys
```

## 6. Data model

All tenant records carry company_id; use composite foreign keys/constraints to prevent cross-company associations. IDs are UUIDs; timestamps UTC; display local dates with explicit timezone. Store money as decimal/minor units with currency.

| Entity | Required contents |
|---|---|
| companies | name, lifecycle stage, current profile revision, created_by |
| memberships | company_id, user_id, owner/member/reviewer role, assigned matter scope, accepted_at, revoked_at |
| profile_revisions | immutable JSON snapshot, version, previous version, confirmer, reason |
| company_facts | typed value, provenance, source version/span, status, validity dates |
| assessments | profile revision, pack versions, missing facts, applicability decisions, generated_at |
| checklist_items | rule_id, applicable status, dependencies, task state, evidence, completion actor |
| matters | type, company_id, context revision, status, relevant jurisdictions, summary |
| documents / document_versions | private object key, hash, type, original name, language, parsing state, immutable version |
| document_spans | document_version, page or paragraph locator, text, extraction quality |
| sources / source_versions | authority, URL, permitted use, jurisdiction, effective dates, checked_at, content hash, review state |
| jurisdiction_packs | scope, version, source refs, rules, templates, reviewer, publication state |
| analysis_runs | matter, inputs hash, profile/source versions, provider/model, mode, status, usage, errors |
| findings | run, category, explanation, company fact refs, document span refs, legal source refs, certainty category |
| questions / answers | matter, required_for, question text, typed answer, confirmer |
| drafts / draft_versions | template version, variables, unresolved placeholders, body, status, content hash |
| reviews | target version/hash, reviewer, assignment scope, decision, comments, decided_at |
| action_items | origin finding, assignee, status, deadline basis, evidence, completion |
| jobs | company, kind, idempotency key, status, attempts, lease expiry, heartbeat, error code |
| audit_events | actor, company, action, object/version, timestamp, redacted change summary |
| exports | target versions, object key, state, requester, expiry, included approval snapshot |

Profile changes mark dependent assessments/drafts stale; they do not alter old approved versions. Deleting a document also deletes derived spans, embeddings and exports or redacts affected references according to the published retention policy. Keep content-free audit events where appropriate. Disclose backup expiry separately.

## 7. API and asynchronous behaviour

Authenticated /api/v1 routes. Validate input, authorise membership and resource scope, then perform mutation. Never obtain tenant scope only from a submitted body.

| Endpoint | Behaviour |
|---|---|
| POST /companies | Create company and owner membership atomically |
| GET/PATCH /companies/:id/profile | Read or confirm revision; optimistic If-Match version check |
| POST /companies/:id/assessments | Queue idempotent assessment; 202 + job ID |
| GET /companies/:id/checklist | Current applicable tasks and unknowns |
| PATCH /checklist-items/:id | Validated actor/state transition with evidence |
| POST /companies/:id/matters | Create employment, supplier or other matter |
| POST /matters/:id/uploads | Short-lived signed upload authorisation and pending version |
| POST /documents/:id/finalise | Verify actual object size/type/hash then enqueue parsing |
| POST /matters/:id/analyses | Queue analysis against immutable inputs |
| GET /jobs/:id | Persisted status/progress, polling first |
| POST /matters/:id/answers | Confirm structured response; refresh affected analysis |
| POST /matters/:id/drafts | Generate only from approved in-scope template |
| POST /reviews | Record authorised review of exact target hash |
| POST /exports | Queue version-specific export |
| DELETE /documents/:id | Revoke access immediately; queue derived-data deletion |

Use 401 unauthenticated, 403/404 for access denial, 409 version conflict, 422 invalid/unsupported request, 429 quota, and structured 5xx service failures. Repeated POSTs with the same tenant-scoped idempotency key return the same operation. Worker leases/retries must not duplicate outputs. Handle cancellation and revoked membership before reading content or publishing results.

## 8. AI workflow and output contract

1. Resolve authorised company/matter and immutable input versions.
2. Validate extraction. Ask for a readable file if text cannot be recovered; never silently invent document content.
3. Resolve jurisdiction and applicable published packs deterministically; unknown applicability generates questions.
4. Retrieve relevant company facts, document spans and legal sources with separate provenance.
5. Generate structured explanation/questions/proposed changes through provider adapter.
6. Validate schema; resolve every reference; check quoted text; test source scope/date and claim support. Citation existence alone is insufficient evidence of legal correctness.
7. Persist verified output or partial/needs_review/failure state; never fill gaps with fabricated citations.
8. Display fact-to-recommendation reasoning. Offer confirmation for suggested memory changes, never silently commit them.

Contract sketch:

```ts
type Finding = {
  id: string;
  kind: 'explanation' | 'question' | 'potential_issue' | 'suggested_change';
  text: string;
  whyForThisCompany: string;
  companyFactIds: string[];
  documentSpanIds: string[];
  legalSourceVersionIds: string[];
  scopeStatus: 'supported' | 'limited' | 'needs_review';
  nextAction?: string;
};
type AnalysisResult = {
  status: 'completed' | 'partial' | 'needs_information' | 'needs_review' | 'failed';
  mode: 'live' | 'synthetic_demo';
  profileRevisionId: string;
  documentVersionIds: string[];
  packVersionIds: string[];
  findings: Finding[];
  proposedFactUpdates: unknown[]; // Replace with validated typed union in domain package.
  errors: { code: string; retryable: boolean }[];
};
```

No unsupported legal claims in an 'explanation' loophole: legal assertions in every category require applicable sources. A document quotation can be explained as its wording without claiming enforceability. Distinguish business preference, draft suggestion and legal obligation. Avoid made-up numeric confidence scores.

LLM outage: show retryable failure and retain inputs; existing published static guidance may remain visible with provenance. Missing template: produce an information checklist instead of an invented agreement. Missing legal coverage: provide factual organisation and escalation. Never report zero findings as full compliance.

## 9. Security, privacy and reliability

Private buckets; tenant RLS for tables/storage; server resource authorisation; least-privilege reviewer access; short-lived authorised downloads. Workers with elevated keys must independently check company/resource association and current permissions. Reviewer invites expire and are revocable.

For initial uploads accept text PDFs and DOCX, max 10 MB and 50 pages; validate magic bytes, archive limits and MIME. Reject macros/executable content and password-protected files with actionable messages. Parse in constrained worker; scanned PDFs get OCR-required state until OCR is implemented. Preserve page/paragraph locators without inventing page numbers for DOCX.

Source ingestion is admin-only from allowlisted authorities, with SSRF protections against private/network metadata addresses, redirects and unbounded downloads. Uploaded instructions cannot trigger network calls or approval changes. Do not automatically browse links found in contracts.

Keep credentials in provider secrets; redact logs and traces. Obtain clear consent before external model processing; document retention and processing region. Confidential client content is not permitted in public demos. Do not advertise attorney-client privilege or cross-border compliance by default.

Enforce configurable per-company upload, token and job budgets with backoff and concurrency limits. Record operational metrics (latency, errors, usage, queue age) without raw document text. Add health/readiness checks, migration discipline, backups and a tested restore path before real-user launch.

## 10. Delivery and definition of done

Implement milestones M0–M7 in docs/BACKLOG.md; their acceptance gates are in docs/ACCEPTANCE_TESTS.md. Maintain docs/STATUS.md with commit and environment evidence.

Proposed LexHack cadence, subject to actual team availability: September 21 foundation; September 22 profile/assessment/checklist; September 23 document ingestion and live analysis; September 24 all matter paths and company memory; September 25 reviewer workflow, packs and evaluation; September 26 fixes, complete walkthrough, video and submission by 18:00 WAT. Official submission cutoff previously verified as September 27 at 22:00 WAT; recheck before submitting.

Roles, not assumed team size: engineering owner (schema/auth/jobs), product/UI owner (adaptive journeys), AI/content owner (retrieval/evaluation), legal reviewer (scope/templates/reference answers). People can combine roles. Integrate daily; freeze schema interfaces before independent feature work.

If time is tight, cut additional templates, supported jurisdictions and optional integrations in that order. Keep company persistence, all three entry paths, honest scope, live evidence, access isolation and the end-to-end lifecycle. An incomplete pack stays limited; never falsify completion to meet the deadline.

Completion means a deployed preview tested with two companies, real persistence and at least one verified live model path, meaningful contextual differences, valid citations, approved initial legal content, passed cross-tenant tests and no critical unreviewed legal claims in the benchmark. It does not mean production legal service readiness.
