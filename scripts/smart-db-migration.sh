#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-storedb}"
PG_SUPERUSER="${PG_SUPERUSER:-postgres}"
AUTO_DEPLOY="${AUTO_DEPLOY:-true}"
FORCE_FRESH="${FORCE_FRESH:-false}"

REQUIRED_TABLES=(
  "users"
  "stores"
  "products"
  "orders"
  "plans"
  "domains"
  "categories"
  "audit_logs"
)

psql_pg() {
  sudo -u "${PG_SUPERUSER}" psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -P pager=off "$@"
}

log() { echo "$@"; }

section() {
  echo "========================================"
  echo "$1"
  echo "========================================"
}

table_exists() {
  local schema="$1"
  local table="$2"
  local res
  res="$(psql_pg -tAc "SELECT to_regclass('${schema}.${table}') IS NOT NULL;")"
  [[ "${res}" == "t" ]]
}

public_tables() {
  psql_pg -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"
}

count_rows_if_exists() {
  local schema="$1"
  local table="$2"
  if table_exists "$schema" "$table"; then
    psql_pg -tAc "SELECT count(*) FROM ${schema}.${table};"
  else
    echo ""
  fi
}

section "🔍 Smart Database Migration"
log "DB: ${DB_NAME}"
log "AUTO_DEPLOY: ${AUTO_DEPLOY}"
log "FORCE_FRESH: ${FORCE_FRESH}"
log "Running as OS user: $(whoami)"
echo "========================================"

# Ensure DB exists (normally it does)
if ! sudo -u "${PG_SUPERUSER}" psql -lqt | cut -d\| -f1 | sed 's/ //g' | grep -qx "${DB_NAME}"; then
  log "❌ Database ${DB_NAME} does not exist."
  exit 1
fi
log "✅ Database exists"

log "ℹ️  Current search_path:"
psql_pg -tAc "SHOW search_path;" | sed 's/^/  /'

log "📊 Info (do NOT confuse these):"
roles_cnt="$(psql_pg -tAc "SELECT count(*) FROM pg_roles WHERE rolcanlogin;")"
users_cnt="$(count_rows_if_exists public users || true)"
log "  - Postgres login roles count: ${roles_cnt} (NOT app users)"
if [[ -n "${users_cnt}" ]]; then
  log "  - App users in public.users: ${users_cnt}"
else
  log "  - App users in public.users: (table missing)"
fi

log "📋 Public tables currently:"
tbls="$(public_tables || true)"
if [[ -n "${tbls}" ]]; then
  echo "${tbls}" | sed 's/^/  - /'
else
  log "  (none)"
fi

# If FORCE_FRESH -> run init schema
if [[ "${FORCE_FRESH}" == "true" ]]; then
  log "⚠️ FORCE_FRESH=true -> running init-schema.sql"
  if [[ ! -f "/opt/storebackend/scripts/init-schema.sql" ]]; then
    log "❌ Missing /opt/storebackend/scripts/init-schema.sql"
    exit 1
  fi
  psql_pg -f /opt/storebackend/scripts/init-schema.sql
  log "✅ init-schema.sql applied"
fi

# If users missing -> init schema
if ! table_exists public users; then
  log "🆕 public.users missing -> initializing schema..."
  if [[ ! -f "/opt/storebackend/scripts/init-schema.sql" ]]; then
    log "❌ Missing /opt/storebackend/scripts/init-schema.sql"
    exit 1
  fi
  psql_pg -f /opt/storebackend/scripts/init-schema.sql
  log "✅ Schema initialized"
fi

# Run migration SQL (idempotent)
log "🧱 Applying migrate-database.sql (idempotent)..."
if [[ ! -f "/opt/storebackend/scripts/migrate-database.sql" ]]; then
  log "❌ Missing /opt/storebackend/scripts/migrate-database.sql"
  exit 1
fi
psql_pg -f /opt/storebackend/scripts/migrate-database.sql
log "✅ migrate-database.sql applied"

# Verify required tables
log "🔎 Verifying required tables..."
missing=()
for t in "${REQUIRED_TABLES[@]}"; do
  if table_exists public "$t"; then
    log "  ✅ public.${t}"
  else
    log "  ❌ MISSING public.${t}"
    missing+=("$t")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo
  log "❌ Migration failed!"
  log "Missing required tables:"
  for t in "${missing[@]}"; do log "  - ${t}"; done
  exit 1
fi

echo
log "✅ All required tables exist"
log "✅ Smart migration finished successfully"
