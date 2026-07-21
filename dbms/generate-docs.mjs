#!/usr/bin/env node
/**
 * Generate dbms documentation from a schema snapshot JSON file.
 * Usage: node dbms/generate-docs.mjs [snapshot-path]
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotDir = join(__dirname, 'snapshots');
const defaultSnapshot = readdirSync(snapshotDir)
  .filter((f) => f.endsWith('_schema.raw.json'))
  .sort()
  .at(-1);
const snapshotPath = process.argv[2] ?? join(snapshotDir, defaultSnapshot);
const data = JSON.parse(readFileSync(snapshotPath, 'utf8'));

/** Data team design diagram vs live DB naming (see DATA_TEAM_ALIGNMENT.md). */
const DATA_TEAM_DESIGN = {
  diagramFile: 'cricket_ai_dev - cricket_ai_dev - matches.png',
  schema: 'matches',
  hubTable: 'fixtures',
  /** design name → live table name (matches schema) */
  tables: [
    { design: 'fixtures', live: 'fixtures', status: 'match' },
    { design: 'fixture_balls', live: 'fixture_balls', status: 'match' },
    { design: 'fixture_batting', live: 'fixture_batting', status: 'match' },
    { design: 'fixture_bowling', live: 'fixture_bowling', status: 'match' },
    {
      design: 'fixture_innings_runs',
      live: 'fixture_inning_overs',
      status: 'alias',
      note: 'Same role: runs/wickets per over',
    },
    { design: 'fixture_lineups', live: 'fixture_lineups', status: 'match' },
    { design: 'fixture_odds', live: 'fixture_odds', status: 'match' },
    { design: 'fixture_runs', live: 'fixture_runs', status: 'match' },
    { design: 'fixture_scoreboards', live: 'fixture_scoreboards', status: 'match' },
    {
      design: 'fixtures_analysis',
      live: null,
      status: 'planned',
      note: 'Post-match / AI analysis table — not deployed in live DB yet',
    },
    {
      design: 'fixture_snapshots',
      live: 'livescore_snapshots',
      status: 'alias',
      note: 'Point-in-time live score snapshots',
    },
    {
      design: null,
      live: 'fixture_weather',
      status: 'live_only',
      note: 'Weather reports per fixture — in live DB, not on data team diagram',
    },
  ],
};

const flywayLocal = {
  public: {
    teams: ['id', 'name', 'code', 'created_at'],
    cricket_matches: [
      'id',
      'home_team_id',
      'away_team_id',
      'match_date',
      'venue',
      'status',
      'winner_team_id',
      'created_at',
    ],
    waitlist: ['id', 'email', 'created_at'],
  },
};

const piiPatterns =
  /email|password|token|secret|phone|address|firstname|lastname|full_name|name/i;

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function rowCount(schema, table) {
  const hit = data.rowCounts.find(
    (r) => r.schemaname === schema && r.relname === table,
  );
  return hit ? Number(hit.n_live_tup) : 0;
}

function inferPurpose(schema, table) {
  const purposes = {
    etl: 'ETL pipeline bookkeeping (batch runs and watermarks).',
    gold: 'Analytics layer — denormalized dimension/fact views over master and matches.',
    master: 'Curated reference and dimension data (teams, players, leagues, etc.).',
    matches: 'Match-centric transactional data (fixtures, ball-by-ball, lineups).',
    public: 'Application-facing tables managed by Flyway in this repo.',
    raw: 'Raw API ingest staging tables from SportMonks and other sources.',
    stats: 'Operational statistics about data fetch runs and table row counts.',
  };
  const base = purposes[schema] ?? 'User schema object.';
  const hints = {
    fixtures: 'Core match/fixture records.',
    fixture_balls: 'Ball-by-ball delivery events.',
    players: 'Player master records.',
    teams: 'Team master records.',
    waitlist: 'CricInsights email waitlist signups.',
    flyway_schema_history: 'Flyway migration audit log.',
  };
  return hints[table] ? `${base} ${hints[table]}` : base;
}

function domainGroup(schema, table) {
  if (schema === 'gold') return 'Analytics (gold layer)';
  if (schema === 'raw') return 'Ingestion (raw layer)';
  if (schema === 'master') {
    if (['teams', 'players', 'team_squad_members', 'player_career_stats'].includes(table))
      return 'Participants';
    if (['leagues', 'seasons', 'stages', 'standings', 'team_rankings'].includes(table))
      return 'Competition structure';
    if (['venues', 'countries', 'continents', 'officials', 'positions'].includes(table))
      return 'Reference data';
    return 'Master data';
  }
  if (schema === 'matches') return 'Match facts';
  if (schema === 'etl') return 'ETL control';
  if (schema === 'stats') return 'Pipeline observability';
  if (schema === 'public') return 'Application';
  return schema;
}

const tables = data.tables.filter((t) => t.table_type === 'BASE TABLE');
const views = data.tables.filter((t) => t.table_type === 'VIEW');
const columnsByTable = groupBy(data.columns, (c) => `${c.table_schema}.${c.table_name}`);
const pksByTable = groupBy(data.primaryKeys, (p) => `${p.schema}.${p.table_name}`);
const fksBySource = groupBy(
  data.foreignKeys,
  (f) => `${f.source_schema}.${f.source_table}`,
);
const indexesByTable = groupBy(data.indexes, (i) => `${i.schemaname}.${i.tablename}`);

const schemas = [...new Set(data.tables.map((t) => t.table_schema))].sort();

// --- DATA_DICTIONARY.json ---
const dictionary = {
  database: data.database,
  engine: data.engine,
  generatedAt: data.generatedAt,
  snapshotSource: snapshotPath.split('/').pop(),
  readOnlyUser: data.dbUser,
  schemas: schemas.map((schemaName) => ({
    name: schemaName,
    domain: domainGroup(schemaName, ''),
    tables: tables
      .filter((t) => t.table_schema === schemaName)
      .map((t) => {
        const key = `${t.table_schema}.${t.table_name}`;
        const cols = columnsByTable.get(key) ?? [];
        return {
          name: t.table_name,
          type: t.table_type,
          purpose: inferPurpose(t.table_schema, t.table_name),
          domain: domainGroup(t.table_schema, t.table_name),
          approxRowCount: rowCount(t.table_schema, t.table_name),
          columns: cols.map((c) => ({
            name: c.column_name,
            ordinal: c.ordinal_position,
            dataType: c.data_type,
            udtName: c.udt_name,
            maxLength: c.character_maximum_length,
            nullable: c.is_nullable === 'YES',
            default: c.column_default,
            pii: piiPatterns.test(c.column_name),
          })),
          primaryKey: (pksByTable.get(key) ?? []).map((p) => p.column_name),
          foreignKeys: (fksBySource.get(key) ?? []).map((f) => ({
            column: f.source_column,
            references: `${f.target_schema}.${f.target_table}.${f.target_column}`,
            onUpdate: f.update_rule,
            onDelete: f.delete_rule,
            constraint: f.constraint_name,
          })),
          indexes: (indexesByTable.get(key) ?? []).map((i) => ({
            name: i.indexname,
            definition: i.indexdef,
          })),
        };
      }),
    views: views
      .filter((v) => v.table_schema === schemaName)
      .map((v) => ({
        name: v.table_name,
        purpose: inferPurpose(v.table_schema, v.table_name),
        domain: domainGroup(v.table_schema, v.table_name),
      })),
  })),
  flywayHistory: data.flywayHistory,
  summary: {
    schemaCount: schemas.length,
    baseTableCount: tables.length,
    viewCount: views.length,
    foreignKeyCount: data.foreignKeys.length,
    indexCount: data.indexes.length,
  },
};

writeFileSync(join(__dirname, 'DATA_DICTIONARY.json'), JSON.stringify(dictionary, null, 2));

// --- SCHEMA.md ---
let schemaMd = `# Database Schema Reference

> Auto-generated from remote snapshot \`${dictionary.snapshotSource}\` on ${data.generatedAt}.
> Database: \`${data.database}\` | Engine: PostgreSQL (Aurora) | Access: read-only (\`${data.dbUser}\`)

## Overview

| Metric | Count |
|--------|------:|
| Schemas | ${schemas.length} |
| Base tables | ${tables.length} |
| Views | ${views.length} |
| Foreign keys | ${data.foreignKeys.length} |
| Indexes | ${data.indexes.length} |

## Schema layers

| Schema | Role | Tables | Views |
|--------|------|-------:|------:|
${schemas
  .map((s) => {
    const tc = tables.filter((t) => t.table_schema === s).length;
    const vc = views.filter((v) => v.table_schema === s).length;
    return `| \`${s}\` | ${inferPurpose(s, '').split('.')[0]} | ${tc} | ${vc} |`;
  })
  .join('\n')}

---

`;

for (const schemaName of schemas) {
  const schemaTables = tables.filter((t) => t.table_schema === schemaName);
  if (schemaTables.length === 0 && views.filter((v) => v.table_schema === schemaName).length === 0)
    continue;

  schemaMd += `## Schema: \`${schemaName}\`\n\n`;

  for (const t of schemaTables) {
    const key = `${t.table_schema}.${t.table_name}`;
    const cols = columnsByTable.get(key) ?? [];
    const fks = fksBySource.get(key) ?? [];
    const idx = indexesByTable.get(key) ?? [];
    const count = rowCount(t.table_schema, t.table_name);

    schemaMd += `### \`${schemaName}.${t.table_name}\`\n\n`;
    schemaMd += `**Purpose:** ${inferPurpose(t.table_schema, t.table_name)}\n\n`;
    schemaMd += `**Approx rows:** ${count.toLocaleString()}\n\n`;
    schemaMd += `| Column | Type | Nullable | Default | Notes |\n`;
    schemaMd += `|--------|------|----------|---------|-------|\n`;

    for (const c of cols) {
      const pk = (pksByTable.get(key) ?? []).some((p) => p.column_name === c.column_name)
        ? 'PK'
        : '';
      const fk = fks.find((f) => f.source_column === c.column_name);
      const fkNote = fk
        ? `FK → \`${fk.target_schema}.${fk.target_table}.${fk.target_column}\``
        : '';
      const pii = piiPatterns.test(c.column_name) ? 'PII' : '';
      const notes = [pk, fkNote, pii].filter(Boolean).join('; ');
      schemaMd += `| \`${c.column_name}\` | ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''} | ${c.is_nullable} | ${c.column_default ?? ''} | ${notes} |\n`;
    }

    if (idx.length) {
      schemaMd += `\n**Indexes:**\n\n`;
      for (const i of idx) {
        schemaMd += `- \`${i.indexname}\`: \`${i.indexdef}\`\n`;
      }
    }

    if (fks.length) {
      schemaMd += `\n**Foreign keys:**\n\n`;
      for (const f of fks) {
        schemaMd += `- \`${f.source_column}\` → \`${f.target_schema}.${f.target_table}.${f.target_column}\` (ON UPDATE ${f.update_rule}, ON DELETE ${f.delete_rule})\n`;
      }
    }

    schemaMd += `\n---\n\n`;
  }

  const schemaViews = views.filter((v) => v.table_schema === schemaName);
  if (schemaViews.length) {
    schemaMd += `### Views in \`${schemaName}\`\n\n`;
    for (const v of schemaViews) {
      schemaMd += `- \`${v.table_name}\` — ${inferPurpose(v.table_schema, v.table_name)}\n`;
    }
    schemaMd += `\n---\n\n`;
  }
}

writeFileSync(join(__dirname, 'SCHEMA.md'), schemaMd);

// --- RELATIONSHIPS.md ---
let relMd = `# Database Relationships

> ${data.foreignKeys.length} foreign key relationships across ${schemas.length} schemas.

## Summary by schema

| Source schema | Outgoing FKs |
|---------------|-------------:|
${schemas
  .map((s) => {
    const n = data.foreignKeys.filter((f) => f.source_schema === s).length;
    return `| \`${s}\` | ${n} |`;
  })
  .join('\n')}

## Relationship catalog

| Source | Column | Target | On update | On delete |
|--------|--------|--------|-----------|-----------|
${data.foreignKeys
  .map(
    (f) =>
      `| \`${f.source_schema}.${f.source_table}\` | \`${f.source_column}\` | \`${f.target_schema}.${f.target_table}.${f.target_column}\` | ${f.update_rule} | ${f.delete_rule} |`,
  )
  .join('\n')}

## Inferred cardinalities

| Pattern | Examples |
|---------|----------|
| 1:N | \`master.teams\` → \`matches.fixtures\` (via team FK columns) |
| 1:N | \`matches.fixtures\` → \`matches.fixture_balls\` |
| 1:N | \`master.players\` → \`master.player_career_stats\` |
| N:M (via bridge) | \`master.team_squad_members\` links teams and players |
| Self-reference | Check FK targets where source and target table match |

## Domain clusters

${[...new Set(tables.map((t) => domainGroup(t.table_schema, t.table_name)))]
  .sort()
  .map((d) => `- **${d}**`)
  .join('\n')}
`;

writeFileSync(join(__dirname, 'RELATIONSHIPS.md'), relMd);

// --- ER diagrams (per schema + overview) ---
function mermaidErForSchema(schemaName, tableList, { maxCols = 8, hubTable = null } = {}) {
  const lines = ['erDiagram'];
  const schemaTables = tableList.filter((t) => t.table_schema === schemaName);
  const tableNames = new Set(schemaTables.map((t) => t.table_name));

  for (const t of schemaTables) {
    const key = `${t.table_schema}.${t.table_name}`;
    const allCols = columnsByTable.get(key) ?? [];
    const cols =
      hubTable && t.table_name === hubTable
        ? allCols
        : maxCols === Infinity
          ? allCols
          : allCols.slice(0, maxCols);
    lines.push(`  ${t.table_name} {`);
    for (const c of cols) {
      const type = (c.udt_name || c.data_type).replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`    ${type} ${c.column_name}`);
    }
    if (maxCols !== Infinity && allCols.length > cols.length) {
      lines.push(`    text _${allCols.length - cols.length}_more_columns`);
    }
    lines.push('  }');
  }

  const added = new Set();
  for (const f of data.foreignKeys) {
    if (f.source_schema !== schemaName) continue;
    if (!tableNames.has(f.source_table)) continue;
    // Intra-schema edges (table → table within schema)
    if (tableNames.has(f.target_table) && f.source_schema === f.target_schema) {
      const edge = `${f.target_table} ||--o{ ${f.source_table} : "${f.source_column}"`;
      if (!added.has(edge)) {
        lines.push(`  ${edge}`);
        added.add(edge);
      }
      continue;
    }
    // Hub edges: child.fixture_id → fixtures (FK target is sportmonks_id on fixtures)
    if (hubTable && f.target_table === hubTable && f.source_table !== hubTable) {
      const edge = `${hubTable} ||--o{ ${f.source_table} : "${f.source_column}"`;
      if (!added.has(edge)) {
        lines.push(`  ${edge}`);
        added.add(edge);
      }
    }
  }
  return lines.join('\n');
}

function generateDataTeamAlignmentMd() {
  const liveMatchesTables = tables
    .filter((t) => t.table_schema === 'matches')
    .map((t) => t.table_name);

  let md = `# Data Team Diagram vs Live Database

> Compares the data team ER diagram (\`${DATA_TEAM_DESIGN.diagramFile}\`) with the **live** \`matches\` schema introspected from Aurora.
> **Live DB names win** for SQL and application code. Use this file to map design labels to production tables.

## Source of truth

| Source | Use for |
|--------|---------|
| Live introspection (\`SCHEMA.md\`, \`DATA_DICTIONARY.json\`) | Queries, migrations, sync scripts |
| Data team PNG | Conceptual layout, onboarding, discussions |
| This file | Translating between the two |

## \`matches\` schema — table mapping

| Data team diagram | Live DB table | Status | Notes |
|-------------------|---------------|--------|-------|
`;

  for (const row of DATA_TEAM_DESIGN.tables) {
    const design = row.design ? `\`${row.design}\`` : '—';
    const live = row.live ? `\`matches.${row.live}\`` : '—';
    const statusLabel = {
      match: '✅ Match',
      alias: '⚠️ Alias (renamed in live DB)',
      planned: '❌ Planned (not in live DB)',
      live_only: '➕ Live only (not on diagram)',
    }[row.status];
    md += `| ${design} | ${live} | ${statusLabel} | ${row.note ?? ''} |\n`;
  }

  md += `
## Structural alignment

Both diagrams use the same **hub-and-spoke** pattern:

\`\`\`text
                    fixtures  (one row = one match)
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
fixture_lineups   fixture_batting      fixture_balls
fixture_bowling   fixture_runs         fixture_scoreboards
fixture_odds      fixture_inning_overs livescore_snapshots
                  fixture_weather
\`\`\`

- Every child table links via \`fixture_id\` → \`matches.fixtures.sportmonks_id\`.
- \`matches\` is the **schema name**, not a table. The hub table is \`fixtures\`.

## Naming aliases (memorize these)

| Data team says | Live DB table |
|----------------|---------------|
| \`fixture_innings_runs\` | \`matches.fixture_inning_overs\` |
| \`fixture_snapshots\` | \`matches.livescore_snapshots\` |

## Not yet in production

| Data team table | Expected purpose |
|-----------------|------------------|
| \`fixtures_analysis\` | Post-match or AI analysis (\`analysis_json\` etc.) — **not created in live DB yet** |

## In production but not on data team diagram

| Live DB table | Purpose |
|---------------|---------|
| \`matches.fixture_weather\` | Weather report snapshots per fixture (\`weather_json\`) |

## Live \`matches\` tables (${liveMatchesTables.length})

${liveMatchesTables.map((t) => `- \`matches.${t}\``).join('\n')}

## Column detail

For full column lists see \`SCHEMA.md\` or \`ER_DIAGRAM_MATCHES_FULL.mmd\`. The data team PNG and the full Mermaid diagram should align on \`fixtures\` hub columns.
`;

  return md;
}

let erMmd = `# Cricket AI — Entity Relationship Diagrams\n\n`;
erMmd += `> Generated ${data.generatedAt}. Diagrams split by schema for readability.\n\n`;
erMmd += `## Architecture overview\n\n\`\`\`mermaid\nflowchart LR\n`;
for (const s of ['raw', 'master', 'matches', 'gold', 'etl', 'stats', 'public']) {
  if (schemas.includes(s)) erMmd += `  ${s}["${s}"]\n`;
}
erMmd += `  raw --> master\n  master --> matches\n  master --> gold\n  matches --> gold\n  etl --> master\n  etl --> matches\n\`\`\`\n\n`;

for (const schemaName of ['master', 'matches', 'raw', 'public', 'etl', 'stats']) {
  if (!schemas.includes(schemaName)) continue;
  const opts =
    schemaName === 'matches'
      ? { maxCols: 12, hubTable: 'fixtures' }
      : { maxCols: 8 };
  const section = mermaidErForSchema(schemaName, tables, opts);
  erMmd += `## ${schemaName}\n\n`;
  if (schemaName === 'matches') {
    erMmd += `> Aligns with data team diagram \`${DATA_TEAM_DESIGN.diagramFile}\`. See \`DATA_TEAM_ALIGNMENT.md\` for alias mapping.\n\n`;
  }
  erMmd += `\`\`\`mermaid\n${section}\n\`\`\`\n\n`;
}

const matchesErFull = [
  '%% matches schema — full columns (live DB)',
  '%% Data team diagram: cricket_ai_dev - cricket_ai_dev - matches.png',
  '%% Aliases: fixture_inning_overs = fixture_innings_runs, livescore_snapshots = fixture_snapshots',
  '%% Planned (not in DB): fixtures_analysis',
  mermaidErForSchema('matches', tables, { maxCols: Infinity, hubTable: 'fixtures' }),
].join('\n');

writeFileSync(join(__dirname, 'ER_DIAGRAM_MATCHES_FULL.mmd'), matchesErFull);

writeFileSync(
  join(__dirname, 'ER_DIAGRAM.mmd'),
  [
    '%% master schema (summary — see ER_DIAGRAM.md for full docs)',
    mermaidErForSchema('master', tables, { maxCols: 10 }),
    '',
    '%% matches schema — aligns with data team diagram (summary)',
    '%% Full columns: ER_DIAGRAM_MATCHES_FULL.mmd | Aliases: DATA_TEAM_ALIGNMENT.md',
    mermaidErForSchema('matches', tables, { maxCols: 12, hubTable: 'fixtures' }),
  ].join('\n'),
);

erMmd += `## matches (full columns)\n\n`;
erMmd += `For every column on \`fixtures\` and all child tables, open \`ER_DIAGRAM_MATCHES_FULL.mmd\` or the data team PNG.\n\n`;
erMmd += `\`\`\`mermaid\n${matchesErFull}\n\`\`\`\n\n`;

writeFileSync(
  join(__dirname, 'ER_DIAGRAM.md'),
  erMmd +
    `\n## Gold layer views\n\nThe \`gold\` schema contains ${views.filter((v) => v.table_schema === 'gold').length} analytical views (dim_*, fact_*, v_fixture_summary) built over master and matches. See \`SCHEMA.md\` for the view list.\n`,
);

writeFileSync(join(__dirname, 'DATA_TEAM_ALIGNMENT.md'), generateDataTeamAlignmentMd());

// --- GAP_ANALYSIS.md ---
const remotePublicTables = tables
  .filter((t) => t.table_schema === 'public')
  .map((t) => t.table_name);
const localPublicTables = Object.keys(flywayLocal.public);
const remoteOnlyPublic = remotePublicTables.filter((t) => !localPublicTables.includes(t));
const localOnlyPublic = localPublicTables.filter((t) => !remotePublicTables.includes(t));

let gapMd = `# Gap Analysis: Remote vs Local Flyway

> Local migrations: \`libs/database/flyway/sql/\` (V1, V2)
> Remote Flyway history: ${data.flywayHistory.map((h) => `V${h.version} (${h.description})`).join(', ')}

## High-level gap

The remote database is a **full cricket data platform** with layered schemas (\`raw\`, \`master\`, \`matches\`, \`gold\`, \`etl\`, \`stats\`). Local Flyway only manages **3 tables in \`public\`**.

| Layer | Remote | In local Flyway |
|-------|--------|-----------------|
| \`raw\` | ${tables.filter((t) => t.table_schema === 'raw').length} tables | No |
| \`master\` | ${tables.filter((t) => t.table_schema === 'master').length} tables | No |
| \`matches\` | ${tables.filter((t) => t.table_schema === 'matches').length} tables | No |
| \`gold\` | ${views.filter((v) => v.table_schema === 'gold').length} views | No |
| \`etl\` | ${tables.filter((t) => t.table_schema === 'etl').length} tables | No |
| \`stats\` | ${tables.filter((t) => t.table_schema === 'stats').length} tables + views | No |
| \`public\` | ${remotePublicTables.length} tables | 3 tables |

## public schema table comparison

| Table | In remote | In local Flyway | Notes |
|-------|-----------|-----------------|-------|
${[...new Set([...remotePublicTables, ...localPublicTables])]
  .sort()
  .map((t) => {
    const inRemote = remotePublicTables.includes(t) ? 'Yes' : 'No';
    const inLocal = localPublicTables.includes(t) ? 'Yes' : 'No';
    let notes = '';
    if (t === 'flyway_schema_history') notes = 'Flyway audit table (auto-created)';
    return `| \`${t}\` | ${inRemote} | ${inLocal} | ${notes} |`;
  })
  .join('\n')}

## Column-level diff (public schema)

`;

for (const tableName of localPublicTables) {
  if (!remotePublicTables.includes(tableName)) continue;
  const key = `public.${tableName}`;
  const remoteCols = (columnsByTable.get(key) ?? []).map((c) => c.column_name);
  const localCols = flywayLocal.public[tableName];
  const onlyRemote = remoteCols.filter((c) => !localCols.includes(c));
  const onlyLocal = localCols.filter((c) => !remoteCols.includes(c));
  gapMd += `### \`public.${tableName}\`\n\n`;
  gapMd += `- Remote columns: ${remoteCols.map((c) => `\`${c}\``).join(', ') || 'none'}\n`;
  gapMd += `- Local Flyway columns: ${localCols.map((c) => `\`${c}\``).join(', ')}\n`;
  gapMd += `- Only in remote: ${onlyRemote.length ? onlyRemote.map((c) => `\`${c}\``).join(', ') : 'none'}\n`;
  gapMd += `- Only in local Flyway: ${onlyLocal.length ? onlyLocal.map((c) => `\`${c}\``).join(', ') : 'none'}\n\n`;
}

gapMd += `## Data team diagram vs live DB

> Detail: \`DATA_TEAM_ALIGNMENT.md\` | Diagram: \`${DATA_TEAM_DESIGN.diagramFile}\`

The data team \`matches\` ER diagram matches the **live hub-and-spoke model** (\`fixtures\` center, child tables on \`fixture_id\`). Differences are naming and completeness only:

| Topic | Data team | Live DB |
|-------|-----------|---------|
| Hub table | \`fixtures\` | \`matches.fixtures\` ✅ |
| Per-over runs | \`fixture_innings_runs\` | \`fixture_inning_overs\` ⚠️ alias |
| Live snapshots | \`fixture_snapshots\` | \`livescore_snapshots\` ⚠️ alias |
| Match analysis | \`fixtures_analysis\` | **Not deployed** ❌ |
| Weather | not shown | \`fixture_weather\` ➕ |

**Do not rename live tables** to match the diagram — update queries and docs using \`DATA_TEAM_ALIGNMENT.md\`.

## Top 3 gaps

1. **Missing schema layers in Flyway** — Remote has \`raw\`, \`master\`, \`matches\`, \`gold\`, \`etl\`, \`stats\`; local Flyway only creates \`public.teams\`, \`public.cricket_matches\`, \`public.waitlist\`.
2. **Separate evolution paths** — Remote \`master.teams\` / \`matches.fixtures\` are the real domain model; local \`public.teams\` / \`public.cricket_matches\` appear to be placeholder app tables (0 rows).
3. **No ETL/pipeline definitions in repo** — \`etl\`, \`stats\`, and \`raw\` tables exist remotely but have no Flyway migrations in this monorepo.

## Recommendations

- Use remote \`master\` + \`matches\` schemas as the source of truth for cricket analytics.
- Keep local \`public\` schema for app-specific tables (waitlist).
- For local dev with real data, sync \`master\` and \`matches\` (see \`IMPORT_ORDER.md\`), not just \`public\`.
`;

writeFileSync(join(__dirname, 'GAP_ANALYSIS.md'), gapMd);

// --- IMPORT_ORDER.md via topological sort ---
function buildImportOrder() {
  const baseTables = tables.map((t) => `${t.table_schema}.${t.table_name}`);
  const tableSet = new Set(baseTables);
  const inDegree = new Map(baseTables.map((t) => [t, 0]));
  const graph = new Map(baseTables.map((t) => [t, []]));

  for (const fk of data.foreignKeys) {
    const src = `${fk.source_schema}.${fk.source_table}`;
    const tgt = `${fk.target_schema}.${fk.target_table}`;
    if (!tableSet.has(src) || !tableSet.has(tgt) || src === tgt) continue;
    graph.get(tgt).push(src);
    inDegree.set(src, (inDegree.get(src) ?? 0) + 1);
  }

  const queue = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([t]) => t)
    .sort();
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const dep of graph.get(node) ?? []) {
      inDegree.set(dep, inDegree.get(dep) - 1);
      if (inDegree.get(dep) === 0) {
        queue.push(dep);
        queue.sort();
      }
    }
  }
  if (order.length !== baseTables.length) {
    return { order: baseTables, cyclic: true };
  }
  return { order, cyclic: false };
}

const { order: importOrder, cyclic } = buildImportOrder();

let importMd = `# Data Import Order

> Safe order for \`pg_dump --data-only\` / restore into local Docker Postgres.
> ${cyclic ? '**Warning:** FK cycles detected — use `--disable-triggers` on restore.' : 'Topological order based on foreign key dependencies.'}

## Prerequisites

1. Local schema must exist (Flyway migrations or full schema dump from remote).
2. Use \`REMOTE_DATABASE_URL\` for dump, \`DATABASE_URL\` for restore.
3. Restore with triggers disabled if FK order conflicts occur.

## Recommended import (by schema layer)

\`\`\`text
1. etl, stats          (pipeline metadata, few dependencies)
2. master              (reference dimensions: continents → countries → leagues → teams → players)
3. matches             (fixtures and match facts)
4. raw                 (optional — large staging tables, mostly empty)
5. public              (app tables: waitlist)
\`\`\`

## Full table order (${importOrder.length} tables)

\`\`\`bash
pg_dump "$REMOTE_DATABASE_URL" \\
  --data-only --no-owner --no-acl --disable-triggers \\
${importOrder.map((t) => `  -t ${t} \\`).join('\n')}
  -f remote_data.sql

psql "$DATABASE_URL" -f remote_data.sql
\`\`\`

## Tables by recommended batch

`;

const batches = {
  etl: importOrder.filter((t) => t.startsWith('etl.')),
  stats: importOrder.filter((t) => t.startsWith('stats.')),
  master: importOrder.filter((t) => t.startsWith('master.')),
  matches: importOrder.filter((t) => t.startsWith('matches.')),
  raw: importOrder.filter((t) => t.startsWith('raw.')),
  public: importOrder.filter((t) => t.startsWith('public.')),
};

for (const [batch, items] of Object.entries(batches)) {
  if (!items.length) continue;
  importMd += `### ${batch} (${items.length})\n\n`;
  for (const t of items) {
    const count = rowCount(...t.split('.'));
    importMd += `- \`${t}\` (~${count.toLocaleString()} rows)\n`;
  }
  importMd += `\n`;
}

writeFileSync(join(__dirname, 'IMPORT_ORDER.md'), importMd);

// --- README.md ---
const topTables = [...data.rowCounts]
  .sort((a, b) => b.n_live_tup - a.n_live_tup)
  .slice(0, 10);

const readme = `# Cricket AI — Database Documentation (dbms)

Machine-readable and human-readable documentation for the remote \`cricket_ai_dev\` PostgreSQL database on Aurora.

## Quick facts

| Item | Value |
|------|-------|
| Database | \`${data.database}\` |
| Engine | PostgreSQL (Aurora ${data.engine.includes('18') ? '18' : '16+'}) |
| Schemas | ${schemas.join(', ')} |
| Base tables | ${tables.length} |
| Views | ${views.length} |
| Foreign keys | ${data.foreignKeys.length} |
| Last snapshot | ${data.generatedAt} |

## Files

| File | Audience | Purpose |
|------|----------|---------|
| \`DATA_DICTIONARY.json\` | AI agents | Structured schema — parse this first |
| \`SCHEMA.md\` | Humans | Full table/column reference |
| \`RELATIONSHIPS.md\` | Both | FK catalog and cardinalities |
| \`ER_DIAGRAM.md\` / \`.mmd\` | Both | Mermaid ER diagrams (summary) |
| \`ER_DIAGRAM_MATCHES_FULL.mmd\` | Both | Full-column \`matches\` schema diagram |
| \`DATA_TEAM_ALIGNMENT.md\` | Both | Data team PNG ↔ live DB name mapping |
| \`${DATA_TEAM_DESIGN.diagramFile}\` | Humans | Official data team \`matches\` ER diagram |
| \`GAP_ANALYSIS.md\` | Developers | Remote vs local Flyway + data team diff |
| \`IMPORT_ORDER.md\` | DevOps | pg_dump/restore order for local sync |
| \`introspection/\` | Automation | SQL queries + refresh script |
| \`snapshots/\` | Automation | Raw JSON introspection output |

## Introspected vs design docs

| Source | What it is |
|--------|------------|
| **Live introspection** (\`SCHEMA.md\`, \`DATA_DICTIONARY.json\`) | Production Aurora schema — **source of truth for code** |
| **Data team PNG** | Design/onboarding diagram for \`matches\` schema |
| **\`DATA_TEAM_ALIGNMENT.md\`** | Maps design table names to live names |

## For AI agents

1. Read \`DATA_DICTIONARY.json\` for structured schema metadata.
2. Use \`RELATIONSHIPS.md\` for join paths and FK rules.
3. Read \`DATA_TEAM_ALIGNMENT.md\` when the data team diagram uses different table names.
4. Check \`GAP_ANALYSIS.md\` before assuming local Flyway matches remote.
5. Use \`IMPORT_ORDER.md\` when syncing data to local Docker.
6. Re-run introspection when schema may have changed (see below).

## Refresh documentation

\`\`\`bash
cd cricket-ai
./dbms/introspection/run-introspection.sh
node dbms/generate-docs.mjs
\`\`\`

Requires \`REMOTE_DATABASE_URL\` in \`.env\`. Uses Docker if \`psql\` is not installed locally.

## Connectivity

Uses \`REMOTE_DATABASE_URL\` from \`.env\` (read-only). Never commit credentials.

## Largest tables (approx rows)

${topTables.map((t) => `- \`${t.schemaname}.${t.relname}\`: ${Number(t.n_live_tup).toLocaleString()}`).join('\n')}

## Read-only access implications

| Allowed | Not allowed |
|---------|-------------|
| SELECT / schema introspection | INSERT, UPDATE, DELETE |
| pg_dump (data export) | CREATE, ALTER, DROP (DDL) |
| EXPLAIN | Flyway migrate against remote |
`;

writeFileSync(join(__dirname, 'README.md'), readme);

console.log('Generated dbms documentation from', snapshotPath);
console.log('Tables:', tables.length, '| FKs:', data.foreignKeys.length, '| Views:', views.length);
