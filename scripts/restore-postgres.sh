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

if [[ "$restore_url" == "${DATABASE_URL:-}" || "$restore_url" == "${DIRECT_URL:-}" ]]; then
  echo "Refusing to restore into DATABASE_URL or DIRECT_URL. Use a separate disposable restore database." >&2
  exit 1
fi

psql --set ON_ERROR_STOP=on "$restore_url" --file "$backup_file"
echo "Restore completed: $backup_file"
