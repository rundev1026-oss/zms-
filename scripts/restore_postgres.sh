#!/usr/bin/env bash
# ==============================================================================
# ZMS — PostgreSQL Restore Script (Linux / Production)
# ==============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file.sql or .sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-zms-postgres}"
DB_NAME="${POSTGRES_DB:-zms}"
DB_USER="${POSTGRES_USER:-zms}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ZMS Restore ERROR] Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[ZMS Restore] Restoring database '${DB_NAME}' from: ${BACKUP_FILE}..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
  else
    gunzip -c "${BACKUP_FILE}" | psql -U "${DB_USER}" -d "${DB_NAME}"
  fi
else
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_FILE}"
  else
    psql -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_FILE}"
  fi
fi

echo "[ZMS Restore] SUCCESS! Database restore completed."

