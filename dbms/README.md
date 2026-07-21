# Cricket AI — Database Documentation (dbms)

Machine-readable and human-readable documentation for the remote `cricket_ai_dev` PostgreSQL database on Aurora.

## Quick facts

| Item | Value |
|------|-------|
| Database | `cricket_ai_dev` |
| Engine | PostgreSQL (Aurora 18) |
| Schemas | etl, gold, master, matches, public, raw, stats |
| Base tables | 65 |
| Views | 22 |
| Foreign keys | 82 |
| Last snapshot | 2026-07-15 11:10:25.657404+00 |

## Files

| File | Audience | Purpose |
|------|----------|---------|
| `DATA_DICTIONARY.json` | AI agents | Structured schema — parse this first |
| `SCHEMA.md` | Humans | Full table/column reference |
| `RELATIONSHIPS.md` | Both | FK catalog and cardinalities |
| `ER_DIAGRAM.md` / `.mmd` | Both | Mermaid ER diagrams (summary) |
| `ER_DIAGRAM_MATCHES_FULL.mmd` | Both | Full-column `matches` schema diagram |
| `DATA_TEAM_ALIGNMENT.md` | Both | Data team PNG ↔ live DB name mapping |
| `cricket_ai_dev - cricket_ai_dev - matches.png` | Humans | Official data team `matches` ER diagram |
| `GAP_ANALYSIS.md` | Developers | Remote vs local Flyway + data team diff |
| `IMPORT_ORDER.md` | DevOps | pg_dump/restore order for local sync |
| `introspection/` | Automation | SQL queries + refresh script |
| `snapshots/` | Automation | Raw JSON introspection output |

## Introspected vs design docs

| Source | What it is |
|--------|------------|
| **Live introspection** (`SCHEMA.md`, `DATA_DICTIONARY.json`) | Production Aurora schema — **source of truth for code** |
| **Data team PNG** | Design/onboarding diagram for `matches` schema |
| **`DATA_TEAM_ALIGNMENT.md`** | Maps design table names to live names |

## For AI agents

1. Read `DATA_DICTIONARY.json` for structured schema metadata.
2. Use `RELATIONSHIPS.md` for join paths and FK rules.
3. Read `DATA_TEAM_ALIGNMENT.md` when the data team diagram uses different table names.
4. Check `GAP_ANALYSIS.md` before assuming local Flyway matches remote.
5. Use `IMPORT_ORDER.md` when syncing data to local Docker.
6. Re-run introspection when schema may have changed (see below).

## Refresh documentation

```bash
cd cricket-ai
./dbms/introspection/run-introspection.sh
node dbms/generate-docs.mjs
```

Requires `REMOTE_DATABASE_URL` in `.env`. Uses Docker if `psql` is not installed locally.

## Connectivity

Uses `REMOTE_DATABASE_URL` from `.env` (read-only). Never commit credentials.

## Largest tables (approx rows)

- `matches.fixture_balls`: 86,790
- `master.player_career_stats`: 73,645
- `raw.fixture_includes`: 48,927
- `matches.fixture_bowling`: 41,465
- `stats.fetch_run_details`: 35,937
- `master.team_squad_members`: 33,203
- `master.players`: 23,258
- `raw.cricket_all_matches`: 22,228
- `matches.fixture_inning_overs`: 13,976
- `matches.fixture_batting`: 13,783

## Read-only access implications

| Allowed | Not allowed |
|---------|-------------|
| SELECT / schema introspection | INSERT, UPDATE, DELETE |
| pg_dump (data export) | CREATE, ALTER, DROP (DDL) |
| EXPLAIN | Flyway migrate against remote |
