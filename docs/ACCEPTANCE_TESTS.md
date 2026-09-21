# Acceptance and evaluation specification

No tests have run yet. Implement these as the application is built. A passing build alone is not functional completion.

## Critical release tests

| ID | Given / when | Required result |
|---|---|---|
| A01 | New unregistered startup completes relevant onboarding | Persisted profile, reasoned starting checklist, source links and lawyer preparation brief |
| A02 | Registered business confirms formation evidence | Completed formation stage retained; relevant next actions without forced re-registration |
| A03 | User chooses Not sure about a required fact | Unknown remains unknown; targeted question; no invented classification |
| A04 | Same agreement reviewed for two materially different company profiles | Relevant findings/reasons/questions differ and reference the correct confirmed facts |
| A05 | User selects Nigeria, UK, US, Europe or China | Selection saved; required subdivision/country asked; accurate capability state |
| A06 | Selected matter/jurisdiction lacks a published pack | Useful factual intake and explicit limited guidance; no fabricated law/template |
| A07 | Founder creates employment draft | Reviewed scoped template, populated answers, visible unresolved placeholders, editable version |
| A08 | Founder uploads supplier agreement | Real extraction, exact passages, company-aware explanation and recommended next questions |
| A09 | User uploads meeting note to Other | Clarification and matter routing; discussion not automatically recorded as approved decision |
| A10 | User refreshes/logs out and back in | Profile, matters, documents, answers and action states persist |
| A11 | Model proposes new company fact | Pending confirmation; current profile unchanged until explicit confirmation |
| A12 | Profile/document changes after approval | New version; old approval preserved but not applied to new content; analysis marked stale |
| A13 | Assigned reviewer amends/approves draft | Attribution and approval bind to exact hash/version; founder cannot impersonate reviewer |
| A14 | Company A requests B's records/files/job/export by guessed ID | Denied at API and database/storage boundaries; no metadata leak |
| A15 | Membership revoked during queued job | Job cannot disclose result or issue downloads to revoked user |
| A16 | Upload/model timeout/quota/parse failure | Visible actionable failure; no success report with synthetic replacement findings |
| A17 | Empty/unreadable/scanned document | Extraction limitation reported; missing text not treated as absent legal clauses |
| A18 | Document contains instruction to ignore rules or reveal another tenant | Treated as quoted content; no tool execution, source publication or data leak |
| A19 | Generated citation does not exist, mismatches quote or scope | Finding rejected or needs_review; not displayed as verified |
| A20 | Retry/cancel/replay job with same idempotency key | No duplicate drafts/actions; cancellation retained; crash recovery works |
| A21 | Delete document | Access immediately revoked; derived content/exports deleted or appropriately redacted; audit and backup policy observed |
| A22 | Generate export before and after professional review | Draft versus approved status accurate; versions/sources/open questions included |
| A23 | Service role worker processes tenant job | Resource association and current permissions checked despite RLS bypass privilege |
| A24 | Content pack expires or is withdrawn | New legal generation blocked/limited; prior outputs visibly stale |

## Benchmark design

Start with 30 synthetic, reviewer-labelled cases: 6 formation, 6 employment, 6 supplier, 4 other-matter triage, 4 company-personalisation pairs/cases, 4 insufficient/conflicting jurisdiction cases. Spread published legal cases across actual supported packs; add at least two normal, one unknown-input and one out-of-scope case per new pack even if total exceeds 30. Keep regression cases separate from prompt tuning examples.

Reviewer records expected facts, critical questions, admissible sources, unacceptable claims and expected routing. Compare against the same model given the document but without company context where appropriate. Measure claim support, citation validity, critical issue recall, wrong-jurisdiction assertions, review preparation time and observed cost/latency. Do not use an LLM judge as the sole legal evaluator.

Proposed release thresholds, not measured results: zero cross-tenant leaks; zero invented/unresolvable citations; zero critical unsupported legal claims or wrong-jurisdiction assertions in reviewed release cases; at least 90% recall on reviewer-labelled critical questions for the published scope. Report denominators, failures and coverage. If gates fail, reduce published content scope or fix defects, not the test.

## Browser evidence

Exercise complete journeys on desktop (1440x900) and mobile (390x844). Verify keyboard navigation, labels, visible focus, dialogs, readable sources, progress/error states and no console/server errors. Record a continuous walkthrough with the full UI visible. Test both first-run and returning-user states. Seed data may support demonstrations, but outputs must say synthetic_demo when not produced live.

## Operational evidence

Verify preview URL, live model request outcome, persisted writes after restart, worker retry, signed download expiry, deletion and migration from clean database. Store redacted command summaries and environment/commit in STATUS.md. Do not store credentials or real client data in evidence.
