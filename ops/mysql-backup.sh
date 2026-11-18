#!/usr/bin/env sh
set -eu

umask 077

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker-compose.deploy.yml"}
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups"}
RETENTION_DAYS=${RETENTION_DAYS:-14}
DB_USER=${DB_USER:-vodda}
DB_NAME=${DB_NAME:-vodda}

: "${DB_PASSWORD:?DB_PASSWORD is required}"

mkdir -p "$BACKUP_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FINAL="$BACKUP_DIR/${DB_NAME}_${STAMP}.sql.gz"
TMP="$FINAL.tmp"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR"
echo "Creating transaction-consistent backup: $FINAL"
docker compose -f "$COMPOSE_FILE" exec -T \
  -e MYSQL_PWD="$DB_PASSWORD" mysql \
  mysqldump \
    --user="$DB_USER" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "$DB_NAME" | gzip -9 > "$TMP"

gzip -t "$TMP"
[ -s "$TMP" ]
mv "$TMP" "$FINAL"
sha256sum "$FINAL" > "$FINAL.sha256"

find "$BACKUP_DIR" -type f \( -name '*.sql.gz' -o -name '*.sql.gz.sha256' \) \
  -mtime "+$RETENTION_DAYS" -delete

trap - EXIT INT TERM
echo "Backup complete: $FINAL"
