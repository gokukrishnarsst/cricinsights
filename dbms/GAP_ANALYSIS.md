# Gap Analysis: Remote vs Local Flyway

> Local migrations: `libs/database/flyway/sql/` (V1, V2)
> Remote Flyway history: V1 (initial schema), V2 (waitlist)

## High-level gap

The remote database is a **full cricket data platform** with layered schemas (`raw`, `master`, `matches`, `gold`, `etl`, `stats`). Local Flyway only manages **3 tables in `public`**.

| Layer | Remote | In local Flyway |
|-------|--------|-----------------|
| `raw` | 27 tables | No |
| `master` | 17 tables | No |
| `matches` | 11 tables | No |
| `gold` | 21 views | No |
| `etl` | 2 tables | No |
| `stats` | 4 tables + views | No |
| `public` | 4 tables | 3 tables |

## public schema table comparison

| Table | In remote | In local Flyway | Notes |
|-------|-----------|-----------------|-------|
| `cricket_matches` | Yes | Yes |  |
| `flyway_schema_history` | Yes | No | Flyway audit table (auto-created) |
| `teams` | Yes | Yes |  |
| `waitlist` | Yes | Yes |  |

## Column-level diff (public schema)

### `public.teams`

- Remote columns: `id`, `name`, `code`, `created_at`
- Local Flyway columns: `id`, `name`, `code`, `created_at`
- Only in remote: none
- Only in local Flyway: none

### `public.cricket_matches`

- Remote columns: `id`, `home_team_id`, `away_team_id`, `match_date`, `venue`, `status`, `winner_team_id`, `created_at`
- Local Flyway columns: `id`, `home_team_id`, `away_team_id`, `match_date`, `venue`, `status`, `winner_team_id`, `created_at`
- Only in remote: none
- Only in local Flyway: none

### `public.waitlist`

- Remote columns: `id`, `email`, `created_at`
- Local Flyway columns: `id`, `email`, `created_at`
- Only in remote: none
- Only in local Flyway: none

## Data team diagram vs live DB

> Detail: `DATA_TEAM_ALIGNMENT.md` | Diagram: `cricket_ai_dev - cricket_ai_dev - matches.png`

The data team `matches` ER diagram matches the **live hub-and-spoke model** (`fixtures` center, child tables on `fixture_id`). Differences are naming and completeness only:

| Topic | Data team | Live DB |
|-------|-----------|---------|
| Hub table | `fixtures` | `matches.fixtures` ✅ |
| Per-over runs | `fixture_innings_runs` | `fixture_inning_overs` ⚠️ alias |
| Live snapshots | `fixture_snapshots` | `livescore_snapshots` ⚠️ alias |
| Match analysis | `fixtures_analysis` | **Not deployed** ❌ |
| Weather | not shown | `fixture_weather` ➕ |

**Do not rename live tables** to match the diagram — update queries and docs using `DATA_TEAM_ALIGNMENT.md`.

## Top 3 gaps

1. **Missing schema layers in Flyway** — Remote has `raw`, `master`, `matches`, `gold`, `etl`, `stats`; local Flyway only creates `public.teams`, `public.cricket_matches`, `public.waitlist`.
2. **Separate evolution paths** — Remote `master.teams` / `matches.fixtures` are the real domain model; local `public.teams` / `public.cricket_matches` appear to be placeholder app tables (0 rows).
3. **No ETL/pipeline definitions in repo** — `etl`, `stats`, and `raw` tables exist remotely but have no Flyway migrations in this monorepo.

## Recommendations

- Use remote `master` + `matches` schemas as the source of truth for cricket analytics.
- Keep local `public` schema for app-specific tables (waitlist).
- For local dev with real data, sync `master` and `matches` (see `IMPORT_ORDER.md`), not just `public`.
