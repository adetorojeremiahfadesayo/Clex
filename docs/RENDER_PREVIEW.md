# Render hackathon preview

The preview uses a free Render web service and a free PostgreSQL 16 instance in the same region. The free database expires 30 days after creation; this is a disposable, synthetic-data demonstration, not durable customer hosting. Keep the GitHub repository private and submit the live URL.

Web service settings (repository root, no Root Directory):

| Setting | Value |
|---|---|
| Branch | `feat/complete-product` until PR #5 is merged |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Start command | `pnpm db:deploy:preview && pnpm --filter @lex/web start` |
| Region | Same as Postgres |
| Compute | Free for the event preview |

Set `APP_ENV=preview`, `DATABASE_URL` to the database's **internal** URL, and `APP_DATABASE_URL` to the same host/database with username `lex_app` and a separately generated password. Keep both URLs as secret environment variables. The start command creates the ordinary `lex_app` role, runs checksum-checked migrations and assigns its password before starting the web server. It never prints either URL or password. The web app connects only as `lex_app` and retains row-level security. The legacy background worker is not deployed; matter analysis runs inside web requests. `APP_URL` is derived from Render's `RENDER_EXTERNAL_URL` unless explicitly set. Leave `LLM_PROVIDER=none` without a verified key so the UI honestly labels local preparation.

After deployment, test `/api/health`, `/api/ready`, fresh guest creation, company profile, checklist, one contract matter and export from a second browser. Use synthetic company details and documents. Record the URL and actual test result in `docs/STATUS.md`. Restrict database external access once internal connectivity is proven. Do not call the draft legal content reviewed or claim a live model call without an opt-in run.
