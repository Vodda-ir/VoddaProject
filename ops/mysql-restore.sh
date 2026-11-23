#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker-compose.deploy.yml"}
DB_USER=${DB_USER:-vodda}
DB_NAME=${DB_NAME:-vodda}
BACKUP_FILE=${1:-}

: "${DB_PASSWORD:?DB_PASSWORD is required}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: CONFIRM_RESTORE=vodda $0 /path/to/backup.sql.gz" >&2
  exit 2
fi
if [ "${CONFIRM_RESTORE:-}" != "vodda" ]; then
  echo "Restore refused. Set CONFIRM_RESTORE=vodda after verifying the target environment." >&2
  exit 2
fi

BACKUP_FILE=$(CDPATH= cd -- "$(dirname -- "$BACKUP_FILE")" && pwd)/$(basename -- "$BACKUP_FILE")
if [ -f "$BACKUP_FILE.sha256" ]; then
  (cd "$(dirname -- "$BACKUP_FILE")" && sha256sum -c "$(basename -- "$BACKUP_FILE").sha256")
else
  echo "Warning: no checksum file found for $BACKUP_FILE" >&2
fi

cd "$ROOT_DIR"
if [ "${RESTORE_SKIP_SAFETY_BACKUP:-false}" != "true" ]; then
  echo "Creating a safety backup before restore..."
  "$ROOT_DIR/ops/mysql-backup.sh"
fi

restart_services() {
  docker compose -f "$COMPOSE_FILE" up -d backend frontend >/dev/null 2>&1 || true
}
trap restart_services EXIT INT TERM

echo "Stopping application services..."
docker compose -f "$COMPOSE_FILE" stop backend frontend

echo "Restoring $BACKUP_FILE into database $DB_NAME..."
case "$BACKUP_FILE" in
  *.sql.gz)
    gzip -dc "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T \
      -e MYSQL_PWD="$DB_PASSWORD" mysql \
      mysql --user="$DB_USER" --default-character-set=utf8mb4 "$DB_NAME"
    ;;
  *.sql)
    docker compose -f "$COMPOSE_FILE" exec -T \
      -e MYSQL_PWD="$DB_PASSWORD" mysql \
      mysql --user="$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < "$BACKUP_FILE"
    ;;
  *)
    echo "Unsupported backup format. Use .sql or .sql.gz" >&2
    exit 2
    ;;
esac

echo "Starting application services..."
docker compose -f "$COMPOSE_FILE" up -d backend frontend
trap - EXIT INT TERM

echo "Restore complete. Verify /ready and run the smoke checks before reopening traffic."
