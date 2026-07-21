#!/usr/bin/env bash
# Refresh remote schema snapshot and regenerate dbms documentation.
# Requires REMOTE_DATABASE_URL in cricket-ai/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SNAPSHOT_DIR="$ROOT/dbms/snapshots"
DATE="$(date +%Y-%m-%d)"
SNAPSHOT="$SNAPSHOT_DIR/${DATE}_schema.raw.json"

cd "$ROOT"
set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${REMOTE_DATABASE_URL:-}" ]]; then
  echo "ERROR: REMOTE_DATABASE_URL is not set in .env" >&2
  exit 1
fi

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    psql "$REMOTE_DATABASE_URL" "$@"
  else
    docker run --rm -i postgres:16-alpine psql "$REMOTE_DATABASE_URL" "$@"
  fi
}

mkdir -p "$SNAPSHOT_DIR"

echo "==> Connectivity check"
run_psql -f dbms/introspection/00_connectivity.sql

echo "==> Exporting schema snapshot to $SNAPSHOT"
run_psql -t -A -c "
SELECT json_build_object(
  'database', current_database(),
  'dbUser', session_user,
  'engine', version(),
  'generatedAt', now()::text,
  'tables', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT table_schema, table_name, table_type FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2) t),
  'columns', (SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) FROM (
    SELECT table_schema, table_name, column_name, ordinal_position, data_type, udt_name,
           character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2,4) c),
  'foreignKeys', (SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json) FROM (
    SELECT ns_src.nspname AS source_schema, src.relname AS source_table, a_src.attname AS source_column,
           ns_tgt.nspname AS target_schema, tgt.relname AS target_table, a_tgt.attname AS target_column,
           con.conname AS constraint_name,
           CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS update_rule,
           CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS delete_rule
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_namespace ns_src ON ns_src.oid = src.relnamespace
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    JOIN pg_namespace ns_tgt ON ns_tgt.oid = tgt.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS src_cols(attnum, ord) ON true
    JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS tgt_cols(attnum, ord) ON src_cols.ord = tgt_cols.ord
    JOIN pg_attribute a_src ON a_src.attrelid = src.oid AND a_src.attnum = src_cols.attnum
    JOIN pg_attribute a_tgt ON a_tgt.attrelid = tgt.oid AND a_tgt.attnum = tgt_cols.attnum
    WHERE con.contype = 'f' AND ns_src.nspname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2,3) f),
  'primaryKeys', (SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json) FROM (
    SELECT n.nspname AS schema, c.relname AS table_name, a.attname AS column_name, con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN LATERAL unnest(con.conkey) AS colnum(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = colnum.attnum
    WHERE con.contype = 'p' AND n.nspname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2,3) p),
  'indexes', (SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json) FROM (
    SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1,2,3) i),
  'rowCounts', (SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) FROM (
    SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC) r),
  'flywayHistory', (SELECT COALESCE(json_agg(row_to_json(h)), '[]'::json) FROM (
    SELECT installed_rank, version, description, type, installed_on, success
    FROM public.flyway_schema_history ORDER BY installed_rank) h)
);
" > "$SNAPSHOT"

echo "==> Generating documentation"
node "$ROOT/dbms/generate-docs.mjs" "$SNAPSHOT"

echo "Done. Snapshot: $SNAPSHOT"
