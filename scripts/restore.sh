#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lht "$PROJECT_DIR/backups"/backup_*.sql.gz 2>/dev/null || echo "  (none found)"
    exit 1
fi

# Load DB credentials from prod env
set -a; source "$PROJECT_DIR/.env.prod"; set +a

echo "[$(date)] Restoring from: $BACKUP_FILE"
echo "WARNING: This will overwrite the current database. Press Ctrl-C within 5 seconds to abort."
sleep 5

# Drop and recreate the DB, then restore
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -c "CREATE DATABASE \"$POSTGRES_DB\";"
gunzip -c "$BACKUP_FILE" | $COMPOSE exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "[$(date)] Restore complete."
