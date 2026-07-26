#!/usr/bin/env bash
set -euo pipefail

backup_file="${1:-}"
restore_url="${RESTORE_DATABASE_URL:-}"

if [[ -z "$backup_file" || ! -s "$backup_file" ]]; then
  echo "Usage: RESTORE_DATABASE_URL=postgresql://... CONFIRM_RESTORE=staging-restore npm run restore:postgres -- backups/file.sql" >&2
  exit 1
fi

if [[ -z "$restore_url" ]]; then
  echo "RESTORE_DATABASE_URL is required and must point to an empty disposable database." >&2
  exit 1
fi

if [[ "${CONFIRM_RESTORE:-}" != "staging-restore" ]]; then
  echo "Set CONFIRM_RESTORE=staging-restore after confirming the destination is an empty disposable database." >&2
  exit 1
fi

for protected_url in "${DATABASE_URL:-}" "${DIRECT_URL:-}"; do
  if [[ -n "$protected_url" ]] && [[ "$(node scripts/postgres-target.mjs "$restore_url" "$protected_url")" == "same" ]]; then
    echo "Refusing to restore into the same database as DATABASE_URL or DIRECT_URL. Use a separate disposable restore database." >&2
    exit 1
  fi
done

public_table_count="$(psql --no-psqlrc --tuples-only --no-align "$restore_url" \
  --command="SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';")"
if [[ "$public_table_count" != "0" ]]; then
  echo "Refusing to restore because the destination public schema contains ${public_table_count} table(s)." >&2
  exit 1
fi

psql --no-psqlrc --set ON_ERROR_STOP=on "$restore_url" --file "$backup_file"

required_table_count="$(psql --no-psqlrc --tuples-only --no-align "$restore_url" \
  --command="SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename IN ('User', 'Term', '_prisma_migrations');")"
if [[ "$required_table_count" != "3" ]]; then
  echo "Restore finished but required application or migration tables are missing." >&2
  exit 1
fi

restored_counts="$(psql --no-psqlrc --tuples-only --no-align --field-separator='|' "$restore_url" \
  --command='SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Term"), (SELECT count(*) FROM "_prisma_migrations");')"
echo "Restore completed: $backup_file"
echo "Verified rows (users|terms|migrations): $restored_counts"
