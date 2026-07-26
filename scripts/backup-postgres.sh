#!/usr/bin/env bash
set -euo pipefail
umask 077

backup_url="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ -z "$backup_url" ]]; then
  echo "DIRECT_URL or DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p backups
timestamp="$(date +%Y%m%d-%H%M%S)"
output="backups/reiwa-shinkango-${timestamp}.sql"
temporary="${output}.tmp"
trap 'rm -f "$temporary"' EXIT
pg_dump \
  --table='public.*' \
  --no-owner \
  --no-privileges \
  --file="$temporary" \
  "$backup_url"
if [[ ! -s "$temporary" ]]; then
  echo "pg_dump completed without producing a backup." >&2
  exit 1
fi
mv "$temporary" "$output"
trap - EXIT
echo "$output"
