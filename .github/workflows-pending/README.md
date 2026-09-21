# Pending workflow

`ci.yml` is the intended GitHub Actions workflow (lint, typecheck, tests against a Postgres 16 service, db bootstrap, production build).

The Hoplite GitHub App installation lacks the `workflows` permission, so it cannot push files under `.github/workflows/`. A repository admin should move `ci.yml` to `.github/workflows/ci.yml` (or grant the app `workflows` permission and let the agent do it).
