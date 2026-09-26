# Clex design system

## Genre
Editorial and approachable. The landing page has cinematic depth; the app remains calm and task-focused.

## Reference DNA
- StudyMate: one obvious judge path, a helpful mascot, visible progress, and a warm surface against deep ink. Clexa is a distinct chick character with a barrister's wig and Clex colors; no StudyMate asset is shipped.
- The Bridge: layered scenery and slow ambient motion. Clex uses an original document scene rather than its landscape or assets.

## Macrostructure
- Marketing/home: statement-led split hero with a living document scene, followed by a compact journey rail and the visitor's real companies.
- App: breadcrumb, clear task heading, a single Clexa next-step guide, then functional cards and evidence.
- Content: restrained reading layout, source status always visible.

## Theme and tokens
The implemented source of truth is `apps/web/src/app/tokens.css`. White Notion-style canvas, near-black ink, emerald action colour, deep emerald gradient heroes (Comp AI reference), dark Raycast-style panels for the checklist and agent chat, and orange/gold/violet accents for highlights and modules. Clexa stays. All new Clex design CSS reads named tokens.

## Typography
- Display: Georgia, serif; expressive but legible.
- Body: system UI sans; compact and clear.
- Labels: body face, tracked uppercase.

## Motion
The landing document scene enters once, then floats slowly; Clexa bobs gently while waving in the illustration. No glows, orbits, sparkles or other "AI" ornamentation. No animation blocks navigation or implies a live AI response. `prefers-reduced-motion` disables ambient motion and shortens transitions.

## Product voice
Clexa guides a founder through profile, checklist, matter, and lawyer packet. It does not impersonate a lawyer or claim legal review. Synthetic demo and local preparation are labelled where shown.

## Shared rules
- One primary action at a time.
- Judge shortcut visible in the first viewport: **Try it out** with **Click demo answers** directly under it. Demo answers are suggestions the judge picks; they are never saved without confirmation.
- Information hierarchy and accessible focus work at 320, 375, 414, and 768 px.
- The app uses actual profile and checklist state; no fabricated compliance score, testimonials, or adoption metrics.
