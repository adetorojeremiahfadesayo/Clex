# Codex build and LexHack submission guide

Updated 26 September 2026. Codex is the development tool; Hoplite is no longer the build handoff. This document records the hackathon-copilot product review and the shortest credible path to a submission.

## Working story

A small business founder starts with a company profile. The confirmed facts change a starting checklist and the questions raised about a hiring or supplier agreement. The founder can upload a document, see exact excerpts and preparation questions, edit a draft outline, and export a packet for their lawyer. The product does not claim to be a licensed lawyer or that draft jurisdiction packs have been reviewed.

The 90-second core demonstration should show **one company before and after profile confirmation**, then one supplier or employment matter with an uploaded sample agreement, one finding tied to an exact excerpt, and the lawyer packet. Show the different context rather than cycling through every feature. A second company with different facts can prove personalization if time allows.

## Product UI review

This review used the rendered local app on 25 September 2026 and the hackathon-copilot product UI guide. Statuses distinguish implementation from live verification.

| Check | Status | Evidence and action |
|---|---|---|
| Specific user and first action | Present | Home explains company profile → tasks → contracts; “Add a company” is above the fold and opened the creation form in the browser. |
| Guest entry | Present | A new browser received a private session and could create a company. The redirect was corrected to keep a relative URL instead of `0.0.0.0`. |
| Founder journey on company overview | Verified on live preview | A prominent next-move panel advanced from company profile to starting checklist after the first saved revision. |
| Error and empty states | Partial | Company empty state and form validation exist; failure/retry behavior needs a final demo-path pass. |
| Accessibility and mobile | Unverified on final revision | Semantic headings, labels and focus styles exist in code. Recheck viewport, keyboard path and overflow after the final build. |
| Metadata and icon | Present | Root metadata provides title/description; Next build linked the SVG icon. Page-specific sharing metadata is absent. |
| Real model integration | Implemented, not tested live | The server adapter and per-run opt-in exist. No real key or successful provider call has been verified. Local preparation must be labelled as such. |
| Legal coverage | Limited | Five selectable markets have draft pointers only; no jurisdiction pack has qualified professional approval. |
| Public proof | Live URL verified | [Render preview](https://lex-company-counsel.onrender.com/) returned healthy/ready responses and completed a synthetic founder journey. A hosted demo video is still needed. |

## Submission gates

The [official LexHack rules](https://lexhack-2026.devpost.com/rules) require a working prototype, a **public code repository or a live URL**, a video no longer than three minutes hosted on YouTube, Vimeo or Loom, and tech-stack/AI-tool credits. The repository remains private; submit the verified [live preview](https://lex-company-counsel.onrender.com/) as public proof. The [official overview](https://lexhack-2026.devpost.com/) gives the deadline as 27 September 2026, 5:00pm EDT (22:00 Africa/Lagos).

Student eligibility is still unconfirmed. The overview says entrants must be students above the local age of majority, while the detailed rules say students aged 13+; confirm each teammate's status and resolve any age conflict with the organizer. Teams may have up to four members, and all contributors must be listed. AI coding tools are allowed but must be disclosed and the team must be able to explain its code.

## Next sequence

1. **Finish demo-path QA:** the local PostgreSQL-backed tests, typecheck, lint and production build passed. The live desktop path completed company creation, profile, checklist, supplier matter, local preparation review and outline. Check document upload, lawyer packet and a mobile viewport on the final deployment.
2. **Keep public proof available:** use the [Render preview](https://lex-company-counsel.onrender.com/) with the private repository. Confirm it still responds immediately before submission.
3. **Make the AI claim exact:** if provider credentials are available, configure them server-side and verify one consented live analysis. Otherwise demo the labelled local preparation mode and describe the model adapter as unverified.
4. **Prepare submission media and copy:** record a complete 2–3 minute real-product walkthrough, host it, capture current screenshots, and disclose Codex, frameworks, model usage status and any pre-existing libraries. Do not claim lawyer approval or broad legal coverage.
5. **Submit with buffer:** aim for 26 September, 18:00 WAT so there is time to resolve upload or form problems before the 27 September, 22:00 WAT cutoff. Verify the Devpost entry actually saves and that the hosted video plays publicly.

The judge-facing emphasis is the context change: one company profile creates a relevant checklist and changes how a document is prepared for counsel. Extra feature breadth is lower priority than a reliable, honest end-to-end demonstration.
