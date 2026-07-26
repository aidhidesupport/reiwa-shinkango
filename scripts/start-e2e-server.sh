#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="file:./e2e.db"
export SESSION_SECRET="e2e-session-secret-with-at-least-32-characters"
export ADMIN_EMAIL="admin-e2e@example.test"
export ADMIN_PASSWORD="local-e2e-admin-password"
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3100"
export CONTACT_EMAIL="contact-e2e@example.test"
export OPERATOR_NAME="令和新漢語E2E"
export DATA_LICENSE="site-only"
export E2E_TEST_MODE="1"
export E2E_MAILBOX_SECRET="reiwa-e2e-mailbox-secret"
export E2E_MAILBOX_PATH="$PWD/prisma/e2e-mailbox.jsonl"

rm -f prisma/e2e.db prisma/e2e.db-journal prisma/e2e-mailbox.jsonl
sqlite3 prisma/e2e.db < prisma/init.sql
npm run prisma:generate >/dev/null
npm run seed >/dev/null
exec npx next dev -H 127.0.0.1 -p 3100
