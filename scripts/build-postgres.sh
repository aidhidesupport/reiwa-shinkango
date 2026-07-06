#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@localhost:5432/postgres}"
export DIRECT_URL="${DIRECT_URL:-postgresql://placeholder:placeholder@localhost:5432/postgres}"

node scripts/write-postgres-schema.mjs
npx prisma generate --schema prisma/schema.postgres.prisma
npx next build
