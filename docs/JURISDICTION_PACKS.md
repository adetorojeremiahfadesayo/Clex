# Jurisdiction and legal-content implementation

## Coverage model

Separate `requested_market`, `jurisdiction_scope`, `matter_type`, `language`, `source_version` and `published_capability`. A selectable country never automatically enables legal conclusions.

Pack states: draft → under_review → published → stale or withdrawn. Publication requires a recorded authorised legal-content reviewer and successful evaluation. Matter capabilities: information_collection, official_links, reviewed_checklist, reviewed_explanation, reviewed_template, document_review. Expose the available capabilities in normal user language.

Initial target registry (all unreviewed until implemented and approved):

| Target | Required scoping | Starting source pointers | Initial status |
|---|---|---|---|
| Nigeria | Entity/activity and relevant state scope | https://cac.gov.ng/services/company-registration ; https://icrp.cac.gov.ng/ | Research pointers only |
| UK | Constituent jurisdiction, entity and matter scope | https://www.gov.uk/browse/business/start-your-business | Research pointers only |
| US | State, locality and relevant federal scope | https://www.sba.gov/counseling/launch-your-business/ | Research pointers only |
| European countries | Actual country/subdivision plus applicable regional rules | https://europa.eu/youreurope/business/lifecycle/starting/startups/index_en.htm | Regional directory only |
| China | Legal territory, locality, domestic/foreign entity and sector scope | https://english.www.gov.cn/services/doingbusiness | Research pointers only |

Pointers found September 21, 2026. These pages are not a complete corpus, reviewed rule pack or permission to reproduce all content. Country-specific employment and supplier sources must be researched separately. The China foreign-investment route must not be applied indiscriminately to every domestic business. Do not label proposed legislation as enacted law.

## Pack manifest to implement

```
id, version, jurisdiction_ids, subdivision_ids, matter_types, entity_types,
industry_scope, excluded_topics, languages, capabilities,
source_version_ids, applicability_rules, checklist_rules, template_ids,
effective_from, effective_to, checked_at, review_due_at,
reviewer_id, reviewed_at, status, evaluation_report_id
```

Rules contain explicit required inputs, yes/no/unknown applicability predicates, linked source passages, next questions, action text and dependencies. The LLM explains selected rules; it does not silently decide publication or statutory deadlines.

Templates contain approved variable slots, conditional clauses, instructions, scope, required answers, permitted modifications and provenance. Drafts with missing required values show placeholders and cannot be marked ready for signature. Generated edits outside approved templates remain suggestions needing review.

## Source ingestion and review

1. Choose exact jurisdiction/matter capability and responsible reviewer.
2. Retrieve official authoritative material; record canonical URL, title, issuing authority, publication/effective dates, language, retrieval time and permitted use.
3. Keep immutable source snapshots or permitted excerpts with content hashes. Respect access/licensing restrictions. Do not copy restricted professional databases.
4. Preserve section and text locators. Distinguish primary law, regulator guidance, official procedure and reviewer-authored commentary.
5. Reviewer authors or verifies applicability rules, checklist, explanatory passages and any templates.
6. Evaluate normal, missing-information, out-of-scope, conflict and outdated-source cases. Record results and corrections.
7. Publish the precise capability only; show excluded topics and review date.
8. On material changes or expired review date, mark stale, block new unsupported generation and notify reviewers. Existing reports remain versioned with a stale-content flag.

Documents can be summarised factually before legal coverage exists, but do not call an unsupported clause enforceable/unlawful or invent a recommended legal position. Ask for expert review when conflicting laws, governing-law ambiguity or missing company facts prevent a supported conclusion.

## Quality gates

- Every legal assertion links to applicable reviewed source passages, not merely a homepage.
- Cross-jurisdiction questions cannot silently retrieve whichever source ranks highest.
- Region labels are resolved before jurisdiction-specific drafting.
- Reviewer role and professional qualification/scope are distinct records; never assume a team invitation verifies credentials.
- No new legal-source publication or approval from model output or user-uploaded instructions.
- Coverage expansion is additive; avoid claiming full support for an entire nation from one formation checklist.
