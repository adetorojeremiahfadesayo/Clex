#!/usr/bin/env bash
# Sources local development database URLs for this sandbox. Idempotent.
# Usage: source scripts/dev-env.sh
set -euo pipefail
if ! pg_isready -q 2>/dev/null; then
  (service postgresql start >/dev/null 2>&1 || sudo service postgresql start >/dev/null 2>&1) || true
  for _ in $(seq 1 20); do pg_isready -q && break; sleep 0.5; done
fi
export PG_ADMIN_URL="${PG_ADMIN_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
export APP_ENV="${APP_ENV:-development}"
export LEX_APP_PASSWORD="${LEX_APP_PASSWORD:-lex_app_dev}"
export LEX_WORKER_PASSWORD="${LEX_WORKER_PASSWORD:-lex_worker_dev}"
eval "$(pnpm --silent db:setup | grep '^export ')"
