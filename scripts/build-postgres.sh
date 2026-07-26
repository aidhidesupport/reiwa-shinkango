#!/usr/bin/env bash
set -euo pipefail

node scripts/check-production-env.mjs
node scripts/write-postgres-schema.mjs
npx prisma generate --schema prisma/schema.postgres.prisma
npx prisma migrate deploy --schema prisma/schema.postgres.prisma
npx next build
