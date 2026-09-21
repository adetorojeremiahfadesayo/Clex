#!/usr/bin/env bash
# Hoplite sandbox setup: install deps, start local Postgres 16, bootstrap lex_dev.
set -euo pipefail
cd "$(dirname "$0")/.."
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
if ! command -v pg_isready >/dev/null; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-16 >/dev/null
fi
service postgresql start >/dev/null 2>&1 || true
for _ in $(seq 1 30); do pg_isready -q && break; sleep 0.5; done
# Local-only superuser password so TCP connections work; never used outside the sandbox.
su postgres -c "psql -qc \"alter role postgres password 'postgres'\"" >/dev/null
source scripts/dev-env.sh
echo "setup complete: migrations applied to lex_dev"
