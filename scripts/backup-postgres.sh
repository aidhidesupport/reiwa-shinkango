#!/usr/bin/env bash
set -euo pipefail

backup_url="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ -z "$backup_url" ]]; then
  echo "DIRECT_URL or DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p backups
timestamp="$(date +%Y%m%d-%H%M%S)"
pg_dump "$backup_url" > "backups/reiwa-shinkango-${timestamp}.sql"
echo "backups/reiwa-shinkango-${timestamp}.sql"
