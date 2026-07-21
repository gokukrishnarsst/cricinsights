/**
 * Gold Schema Inspector
 * ─────────────────────
 * Connects to cricket_ai_dev and produces a full report of every view/table
 * in the `gold` schema: columns, sample rows, and row counts.
 *
 * Usage (from project root):
 *   node scripts/inspect-gold-schema.mjs
 *
 * Env (auto-loaded from .env):
 *   DATABASE_URL         — direct connection string
 *   REMOTE_DATABASE_URL  — Aurora read-replica (preferred if set)
 *   DATABASE_HOST / DATABASE_PORT / DATABASE_NAME / DATABASE_USER / DATABASE_PASSWORD
 */

// Resolve `pg` from the database lib's package (pnpm workspace layout).
import { createRequire } from 'module';
const require = createRequire(
  new URL('../libs/database/package.json', import.meta.url)
);
const pg = require('pg');
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Load .env manually (zero external deps) ─────────────────────────────────
const envPath = resolve(ROOT, '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('✅  Loaded .env from', envPath);
} else {
  console.warn('⚠️   No .env found at', envPath, '— using existing environment variables');
}

// ─── Resolve connection URL ───────────────────────────────────────────────────
function resolveConnectionUrl() {
  const remote = process.env.REMOTE_DATABASE_URL?.trim();
  if (remote) {
    console.log('🔌  Using REMOTE_DATABASE_URL (Aurora read replica)');
    return remote;
  }
  const direct = process.env.DATABASE_URL;
  if (direct) {
    console.log('🔌  Using DATABASE_URL');
    return direct;
  }
  const host     = process.env.DATABASE_HOST     ?? 'localhost';
  const port     = process.env.DATABASE_PORT     ?? '5433';
  const name     = process.env.DATABASE_NAME     ?? 'cricket_ai_dev';
  const user     = process.env.DATABASE_USER     ?? 'cricketadmin';
  const password = process.env.DATABASE_PASSWORD ?? 'cricketadmin';
  console.log(`🔌  Using constructed URL → ${host}:${port}/${name}`);
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

const connectionString = resolveConnectionUrl();

// SSL — enable for Amazon RDS / Aurora.
// We strip ?sslmode=... from the URL so pg doesn't run libpq SSL validation,
// then pass the config object directly (rejectUnauthorized=false accepts self-signed RDS certs).
const needsSsl =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('amazonaws.com') ||
  connectionString.includes('rds.amazonaws') ||
  connectionString.includes('sslmode=verify');

const cleanUrl = connectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]uselibpqcompat=[^&]*/g, '');
const ssl = needsSsl ? { rejectUnauthorized: false } : false;

// Suppress Node TLS errors for self-signed RDS CA (inspect script only — not for production)
if (needsSsl) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({ connectionString: cleanUrl, ssl, max: 3, idleTimeoutMillis: 8000 });


// ─── Console helpers ──────────────────────────────────────────────────────────
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const SEP    = '─'.repeat(72);

function header(text) {
  console.log(`\n${BOLD}${CYAN}${SEP}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${text}${RESET}`);
  console.log(`${BOLD}${CYAN}${SEP}${RESET}`);
}

function sub(text) {
  console.log(`\n${BOLD}${YELLOW}  ▶ ${text}${RESET}`);
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

/** All views, materialized views, and base tables in the gold schema */
async function listGoldObjects(client) {
  const { rows } = await client.query(`
    SELECT table_name AS name, 'view' AS kind
    FROM information_schema.views
    WHERE table_schema = 'gold'
    UNION ALL
    SELECT matviewname AS name, 'materialized_view' AS kind
    FROM pg_matviews
    WHERE schemaname = 'gold'
    UNION ALL
    SELECT table_name AS name, 'table' AS kind
    FROM information_schema.tables
    WHERE table_schema = 'gold' AND table_type = 'BASE TABLE'
    ORDER BY name
  `);
  return rows;
}

/** Column metadata for a single gold object */
async function getColumns(client, name) {
  const { rows } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'gold' AND table_name = $1
    ORDER BY ordinal_position
  `, [name]);
  return rows;
}

/** Safe row count */
async function rowCount(client, name) {
  try {
    const { rows } = await client.query(`SELECT COUNT(*) AS cnt FROM gold."${name}"`);
    return Number(rows[0].cnt);
  } catch { return null; }
}

/** Up to 5 sample rows */
async function sample(client, name) {
  try {
    const { rows } = await client.query(`SELECT * FROM gold."${name}" LIMIT 5`);
    return rows;
  } catch (e) { return { error: e.message }; }
}

/** Distinct values for low-cardinality columns (useful for enum discovery) */
async function distinctValues(client, name, col, dtype) {
  const textTypes = ['boolean', 'text', 'character varying', 'USER-DEFINED'];
  if (!textTypes.includes(dtype)) return null;
  try {
    const { rows } = await client.query(`
      SELECT DISTINCT "${col}"
      FROM gold."${name}"
      WHERE "${col}" IS NOT NULL
      ORDER BY "${col}"
      LIMIT 25
    `);
    if (rows.length >= 25) return null; // high-cardinality, skip
    return rows.map(r => r[col]);
  } catch { return null; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const client = await pool.connect();

  try {
    header('🏏  Cricket AI — Gold Schema Full Inspection');

    // Connectivity check
    const { rows: ver } = await client.query('SELECT version()');
    console.log(`\n${GREEN}  Connected:${RESET}`, ver[0].version.split(' ').slice(0, 2).join(' '));

    // 1. Enumerate gold objects
    const objects = await listGoldObjects(client);

    if (objects.length === 0) {
      console.log('\n⚠️   No views/tables found in the gold schema.');
      console.log('     Run the ETL pipeline first: the gold schema is built by ETL.\n');
      return;
    }

    header(`📦  Gold Schema Objects  (${objects.length} found)`);
    const kindEmoji = { view: '🔵', materialized_view: '🟣', table: '🟢' };
    const kindCount = {};
    for (const o of objects) {
      kindCount[o.kind] = (kindCount[o.kind] ?? 0) + 1;
      console.log(`  ${kindEmoji[o.kind] ?? '⚪'} [${o.kind.padEnd(18)}]  gold.${o.name}`);
    }
    console.log('\n  Totals:', Object.entries(kindCount).map(([k,c]) => `${c} ${k}(s)`).join(' | '));

    // 2. Deep inspection per object
    const report = [];

    for (const { name, kind } of objects) {
      sub(`gold.${name}  [${kind}]`);

      const [cols, count, rows] = await Promise.all([
        getColumns(client, name),
        rowCount(client, name),
        sample(client, name),
      ]);

      const countLabel = count === null ? '(error)' : count.toLocaleString();
      console.log(`  Rows: ${countLabel}  |  Columns: ${cols.length}`);

      // Column table
      console.log('\n  Columns:');
      console.log('  ┌────────────────────────────────────┬────────────────────────┬──────────┐');
      console.log('  │ Column Name                        │ Data Type              │ Nullable │');
      console.log('  ├────────────────────────────────────┼────────────────────────┼──────────┤');
      for (const c of cols) {
        const cn = c.column_name.padEnd(34);
        const dt = c.data_type.padEnd(22);
        const nl = c.is_nullable.padEnd(8);
        console.log(`  │ ${cn} │ ${dt} │ ${nl} │`);
      }
      console.log('  └────────────────────────────────────┴────────────────────────┴──────────┘');

      // Distinct values for enum-like columns
      const enumCols = [];
      for (const c of cols) {
        const vals = await distinctValues(client, name, c.column_name, c.data_type);
        if (vals && vals.length > 0) {
          enumCols.push({ col: c.column_name, vals });
        }
      }
      if (enumCols.length > 0) {
        console.log('\n  Distinct / Enum Values:');
        for (const { col, vals } of enumCols) {
          const display = vals.slice(0, 15).map(v => JSON.stringify(v)).join(', ');
          const extra   = vals.length > 15 ? ` … +${vals.length - 15}` : '';
          console.log(`    ${col}: [${display}${extra}]`);
        }
      }

      // Sample rows
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`\n  Sample rows (up to 5):`);
        for (const [i, row] of rows.entries()) {
          const keys    = Object.keys(row);
          const preview = keys.slice(0, 10).map(k => `${k}=${JSON.stringify(row[k])}`).join(', ');
          const extra   = keys.length > 10 ? ` … +${keys.length - 10} more cols` : '';
          console.log(`    [${i + 1}] { ${preview}${extra} }`);
        }
      } else if (rows?.error) {
        console.log(`\n  ⚠️  Sample failed: ${rows.error}`);
      } else {
        console.log(`\n  (table is empty — no rows yet)`);
      }

      report.push({ name, kind, count, columnCount: cols.length, cols, enumCols });
    }

    // 3. Summary table
    header('📊  Summary Table');
    console.log('\n  Object Name                    │ Kind               │ Rows        │ Cols');
    console.log('  ────────────────────────────── ┼────────────────────┼─────────────┼─────');
    for (const r of report) {
      const n = r.name.padEnd(30);
      const k = r.kind.padEnd(18);
      const c = (r.count === null ? 'ERROR' : r.count.toLocaleString()).padEnd(11);
      console.log(`  ${n} │ ${k} │ ${c} │ ${r.columnCount}`);
    }

    // 4. Cross-view column index (which columns appear across views)
    header('🔗  Cross-View Column Index  (shared columns)');
    const colIndex = {};
    for (const r of report) {
      for (const col of r.cols) {
        if (!colIndex[col.column_name]) colIndex[col.column_name] = [];
        colIndex[col.column_name].push(r.name);
      }
    }
    const shared = Object.entries(colIndex)
      .filter(([, v]) => v.length > 1)
      .sort((a, b) => b[1].length - a[1].length);

    if (shared.length === 0) {
      console.log('\n  (no columns shared across views)');
    } else {
      console.log(`\n  ${shared.length} columns appear in more than one view:\n`);
      for (const [col, views] of shared.slice(0, 40)) {
        console.log(`    ${col.padEnd(38)} in ${views.length} views: ${views.join(', ')}`);
      }
    }

    // 5. Populate vs Empty summary
    header('🟢  Populated vs Empty Views');
    const populated = report.filter(r => r.count !== null && r.count > 0);
    const empty     = report.filter(r => r.count === null || r.count === 0);
    console.log(`\n  ${GREEN}Populated (${populated.length}):${RESET}`);
    for (const r of populated) console.log(`    ✅  gold.${r.name}  (${r.count?.toLocaleString()} rows)`);
    console.log(`\n  ${YELLOW}Empty / Error (${empty.length}):${RESET}`);
    for (const r of empty) console.log(`    ⚪  gold.${r.name}`);

    console.log(`\n${GREEN}✅  Inspection complete!${RESET}`);
    console.log('    Copy the output above and share it for the full gold-schema report.\n');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`\n❌  Fatal: ${err.message}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('    Is the database running? Check docker-compose and DATABASE_HOST/PORT.');
  }
  console.error(err.stack);
  process.exit(1);
});
