#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required. Use Supabase runtime/session pooler URL." >&2
  exit 1
fi

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "DIRECT_URL is required. Use Supabase direct URL, or session pooler URL when direct IPv6 is unavailable." >&2
  exit 1
fi

node scripts/write-postgres-schema.mjs
npx prisma generate --schema prisma/schema.postgres.prisma
npx prisma migrate deploy --schema prisma/schema.postgres.prisma
