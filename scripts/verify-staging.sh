#!/usr/bin/env bash
set -euo pipefail

node scripts/check-production-env.mjs
npm run prisma:migrate:postgres
npm run seed
npm run build:postgres
curl --fail --show-error --silent "${NEXT_PUBLIC_SITE_URL%/}/api/health"
echo
echo "Staging environment, migration, seed, build, and health checks passed."
