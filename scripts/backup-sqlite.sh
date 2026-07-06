#!/usr/bin/env bash
set -euo pipefail

mkdir -p backups
timestamp="$(date +%Y%m%d-%H%M%S)"
sqlite3 prisma/dev.db ".backup 'backups/reiwa-shinkango-${timestamp}.db'"
echo "backups/reiwa-shinkango-${timestamp}.db"
