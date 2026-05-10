#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"

# Load DB credentials from prod env
set -a; source "$PROJECT_DIR/.env.prod"; set +a

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."
$COMPOSE exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup saved: $BACKUP_FILE"

# Upload to Google Drive (dedicated backup account)
echo "[$(date)] Uploading to Google Drive..."
rclone copy "$BACKUP_FILE" gdriveVM:tsvm2026-backups/
echo "[$(date)] Uploaded."

# Keep only the last 30 backups locally
ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
echo "[$(date)] Done."
