#!/usr/bin/env bash
# ==============================================================================
# ZMS — PostgreSQL Automated Backup Script (Linux / Production)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/zms_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="${CONTAINER_NAME:-zms-postgres}"
DB_NAME="${POSTGRES_DB:-zms}"
DB_USER="${POSTGRES_USER:-zms}"

mkdir -p "${BACKUP_DIR}"

echo "[ZMS Backup] Starting PostgreSQL backup for database: ${DB_NAME}..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[ZMS Backup] Backing up via Docker container: ${CONTAINER_NAME}..."
  docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
elif command -v pg_dump >/dev/null 2>&1; then
  echo "[ZMS Backup] Backing up via local pg_dump..."
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
else
  echo "[ZMS Backup ERROR] Neither active Docker container '${CONTAINER_NAME}' nor local 'pg_dump' found!"
  exit 1
fi

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[ZMS Backup] SUCCESS! Backup saved to: ${BACKUP_FILE} (${FILESIZE})"

# Retention policy: Remove backups older than 30 days
echo "[ZMS Backup] Pruning backups older than 30 days..."
find "${BACKUP_DIR}" -name "zms_backup_*.sql.gz" -mtime +30 -exec rm -f {} \;
echo "[ZMS Backup] Backup maintenance completed successfully."

