#!/usr/bin/env bash
set -euo pipefail

node scripts/check-production-env.mjs
node scripts/write-postgres-schema.mjs
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required. Use the Supabase runtime connection string." >&2
  exit 1
fi
if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "DIRECT_URL is required. Use the Supabase direct or session-pooler connection string." >&2
  exit 1
fi

npx prisma migrate deploy --schema prisma/schema.postgres.prisma
npm run start
