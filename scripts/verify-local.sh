#!/usr/bin/env bash
set -euo pipefail

npm audit --omit=dev --audit-level=high
npm test
npm run typecheck
npm run build
npm run test:e2e
git diff --check

echo "Local release checks passed."
