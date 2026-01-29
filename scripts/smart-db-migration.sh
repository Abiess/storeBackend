#!/usr/bin/env bash
set -euo pipefail

# =======================
# Configuration
# =======================
DB_NAME="${DB_NAME:-storedb}"
PG_SUPERUSER="${PG_SUPERUSER:-postgres}"

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/storebackend/scripts}"
INIT_SQL="${INIT_SQL:-$SCRIPTS_DIR/init-schema.sql}"
MIGRATE_SQL="${MIGRATE_SQL:-$SCRIPTS_DIR/migrate-database.sql}"

# CI/Auto deploy behavior:
AUTO_DEPLOY="${AUTO_DEPLOY:-true}"        # true => automatically choose migration
FORCE_FRESH="${FORCE_FRESH:-false}"       # true => drop and recreate schema (DANGEROUS)

# Tables your app expects (adjust as needed)
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

# =======================
# Helpers
# =======================
psql_pg() {
  sudo -u "${PG_SUPERUSER}" psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -P pager=off "$@"
}

db_exists() {
  sudo -u "${PG_SUPERUSER}" psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1
}

table_exists() {
  local schema="$1"
  local table="$2"
  local res
  res="$(psql_pg -tAc "SELECT to_regclass('${schema}.${table}') IS NOT NULL;")"
  [[ "${res}" == "t" ]]
}

list_public_tables() {
  psql_pg -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"
}

count_app_users_if_exists() {
  if table_exists "public" "users"; then
    psql_pg -tAc "SELECT count(*) FROM public.users;"
  else
    echo ""
  fi
}

count_login_roles() {
  # purely informational: number of login roles (NOT app users!)
  psql_pg -tAc "SELECT count(*) FROM pg_roles WHERE rolcanlogin;"
}

missing_required_tables() {
  local missing=()
  for t in "${REQUIRED_TABLES[@]}"; do
    if ! table_exists "public" "$t"; then
      missing+=("$t")
    fi
  done

  if (( ${#missing[@]} > 0 )); then
    printf "%s\n" "${missing[@]}"
  fi
}

run_init_schema() {
  echo "🆕 Running init schema: ${INIT_SQL}"
  [[ -f "${INIT_SQL}" ]] || { echo "❌ Missing ${INIT_SQL}"; exit 1; }
  psql_pg -f "${INIT_SQL}"
  echo "✅ init-schema.sql applied"
}

run_migration() {
  echo "🔄 Running migration: ${MIGRATE_SQL}"
  [[ -f "${MIGRATE_SQL}" ]] || { echo "❌ Missing ${MIGRATE_SQL}"; exit 1; }
  psql_pg -f "${MIGRATE_SQL}"
  echo "✅ migrate-database.sql applied"
}

fresh_install() {
  echo "🗑️  FRESH INSTALL selected (DANGEROUS) - dropping public schema..."
  psql_pg -c "DROP SCHEMA IF EXISTS public CASCADE;"
  psql_pg -c "CREATE SCHEMA public;"
  run_init_schema
  run_migration
}

# =======================
# Main
# =======================
echo "========================================"
echo "🔍 Smart Database Migration"
echo "DB: ${DB_NAME}"
echo "AUTO_DEPLOY: ${AUTO_DEPLOY}"
echo "FORCE_FRESH: ${FORCE_FRESH}"
echo "Running as OS user: $(whoami)"
echo "========================================"

# DB existence check
if ! db_exists; then
  echo "❌ Database '${DB_NAME}' does not exist."
  echo "   (This script currently expects DB to exist.)"
  echo "   Create it first or extend script to create DB."
  exit 1
fi

echo "✅ Database exists"

echo "ℹ️  Current search_path:"
psql_pg -tAc "SHOW search_path;" | sed 's/^/  /'

echo "📊 Info (do NOT confuse these):"
LOGIN_ROLES="$(count_login_roles || true)"
APP_USERS="$(count_app_users_if_exists || true)"

echo "  - Postgres login roles count: ${LOGIN_ROLES:-unknown} (NOT app users)"
if [[ -n "${APP_USERS}" ]]; then
  echo "  - App users in public.users: ${APP_USERS}"
else
  echo "  - App users: public.users table does not exist"
fi

echo "📋 Public tables currently:"
PUB_TABLES="$(list_public_tables || true)"
if [[ -n "${PUB_TABLES}" ]]; then
  echo "${PUB_TABLES}" | sed 's/^/  - /'
else
  echo "  (none)"
fi

MISSING="$(missing_required_tables || true)"

if [[ -n "${MISSING}" ]]; then
  echo "⚠️  Missing required tables:"
  echo "${MISSING}" | sed 's/^/  - /'
else
  echo "✅ All required tables appear to exist"
fi

# FORCE_FRESH has top priority
if [[ "${FORCE_FRESH}" == "true" ]]; then
  fresh_install
  echo "✅ Fresh install complete"
  exit 0
fi

# Decide what to do
# Case A: no tables at all => init + migrate
if [[ -z "${PUB_TABLES}" ]]; then
  echo "🆕 No tables found in public schema -> initializing schema..."
  run
