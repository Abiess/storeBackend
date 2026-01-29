#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-storedb}"
PG_SUPERUSER="${PG_SUPERUSER:-postgres}"

# Match the tables you expect (same list as smart-db-migration)
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
  # pager off, stop on error
  sudo -u "${PG_SUPERUSER}" psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -P pager=off "$@"
}

section() {
  echo
  echo "==============================================="
  echo "$1"
  echo "==============================================="
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

count_rows_if_exists() {
  local schema="$1"
  local table="$2"
  if table_exists "$schema" "$table"; then
    psql_pg -tAc "SELECT count(*) FROM ${schema}.${table};"
  else
    echo ""
  fi
}

echo "==============================================="
echo "PostgreSQL Database Diagnostics (App-focused)"
echo "DB: ${DB_NAME}"
echo "PG_SUPERUSER: ${PG_SUPERUSER}"
echo "Host: localhost:5432"
echo "OS User: $(whoami)"
echo "Time: $(date -Is)"
echo "==============================================="

section "1) Schemas (non-system)"
psql_pg -tAc "
SELECT nspname
FROM pg_namespace
WHERE nspname NOT IN ('pg_catalog','information_schema')
  AND nspname NOT LIKE 'pg_toast%'
ORDER BY 1;
" | sed 's/^/  - /'

section "2) search_path"
psql_pg -tAc "SHOW search_path;" | sed 's/^/  /'

section "3) Public tables"
PUB_TABLES="$(list_public_tables || true)"
if [[ -n "${PUB_TABLES}" ]]; then
  echo "${PUB_TABLES}" | sed 's/^/  - /'
  echo
  echo "  Total tables in public: $(echo "${PUB_TABLES}" | wc -l | tr -d ' ')"
else
  echo "  (none)"
  echo
  echo "  Total tables in public: 0"
fi

section "4) Required tables existence (public.*)"
missing=()
for t in "${REQUIRED_TABLES[@]}"; do
  if table_exists "public" "$t"; then
    echo "  ✅ public.${t}"
  else
    echo "  ❌ MISSING public.${t}"
    missing+=("$t")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo
  echo "⚠️  Missing required tables:"
  for t in "${missing[@]}"; do
    echo "  - ${t}"
  done
else
  echo
  echo "✅ All required tables exist."
fi

section "5) Key counts (only if tables exist)"
users_cnt="$(count_rows_if_exists public users || true)"
orders_cnt="$(count_rows_if_exists public orders || true)"
products_cnt="$(count_rows_if_exists public products || true)"
stores_cnt="$(count_rows_if_exists public stores || true)"
audit_cnt="$(count_rows_if_exists public audit_logs || true)"

if [[ -n "${users_cnt}" ]]; then echo "  public.users: ${users_cnt} row(s)"; else echo "  public.users: (table missing)"; fi
if [[ -n "${stores_cnt}" ]]; then echo "  public.stores: ${stores_cnt} row(s)"; else echo "  public.stores: (table missing)"; fi
if [[ -n "${products_cnt}" ]]; then echo "  public.products: ${products_cnt} row(s)"; else echo "  public.products: (table missing)"; fi
if [[ -n "${orders_cnt}" ]]; then echo "  public.orders: ${orders_cnt} row(s)"; else echo "  public.orders: (table missing)"; fi
if [[ -n "${audit_cnt}" ]]; then echo "  public.audit_logs: ${audit_cnt} row(s)"; else echo "  public.audit_logs: (table missing)"; fi

section "6) Sanity checks (why it 'looked like it worked')"
echo "This prints Postgres login roles count (NOT app users):"
psql_pg -tAc "SELECT count(*) FROM pg_roles WHERE rolcanlogin;" | sed 's/^/  rolcanlogin count: /'

echo
echo "Does public.users exist? (authoritative):"
psql_pg -tAc "SELECT to_regclass('public.users');" | sed 's/^/  to_regclass: /'

echo
echo "✅ Diagnostics complete."
