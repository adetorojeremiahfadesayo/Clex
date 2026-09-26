# Render hackathon preview

The preview uses a free Render web service and a free PostgreSQL 16 instance in the same region. The free database expires 30 days after creation; this is a disposable, synthetic-data demonstration, not durable customer hosting. Keep the GitHub repository private and submit the live URL.

Live URL: https://lex-company-counsel.onrender.com/ . Deployment was verified on 26 September 2026 from commit `826219b`: `/api/health` returned HTTP 200, `/api/ready` reported `database: ok` and five migrations, and a browser completed synthetic company creation, profile, checklist, supplier matter, local preparation analysis and outline generation. The model mode is `no_model_configured`.

The repository includes `render.yaml`. In Render, create a Blueprint from the private repository's `feat/complete-product` branch. It references the already-created database by name and generates a separate app-role password. Its web service settings are:

| Setting | Value |
|---|---|
| Branch | `feat/complete-product` until PR #5 is merged |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Start command | `pnpm db:deploy:preview && pnpm --filter @lex/web start` |
| Region | Same as Postgres |
| Compute | Free for the event preview |

The Blueprint injects `DATABASE_URL` from the database's **internal** URL and generates `LEX_APP_PASSWORD`. The start command creates the ordinary `lex_app` role, runs checksum-checked migrations and assigns its password before starting the web server. It never prints either URL or password. The web app derives its connection URL for `lex_app` and retains row-level security. The legacy background worker is not deployed; matter analysis runs inside web requests. `APP_URL` is derived from Render's `RENDER_EXTERNAL_URL` unless explicitly set. Leave `LLM_PROVIDER=none` without a verified key so the UI honestly labels local preparation.

For final QA, test document upload, export, and a second browser. Use synthetic company details and documents. Restrict database external access once internal connectivity is proven. Do not call the draft legal content reviewed or claim a live model call without an opt-in run.
