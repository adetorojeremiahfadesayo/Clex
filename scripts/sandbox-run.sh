#!/usr/bin/env bash
# Hoplite preview run: web on $PORT (default 3000) plus the durable worker.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/dev-env.sh
export PORT="${PORT:-3000}" HOST=0.0.0.0
pnpm --filter @lex/worker dev &
WORKER=$!
trap 'kill $WORKER 2>/dev/null || true' EXIT
exec pnpm --filter @lex/web dev
