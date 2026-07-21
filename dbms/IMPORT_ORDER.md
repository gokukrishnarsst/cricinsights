# Data Import Order

> Safe order for `pg_dump --data-only` / restore into local Docker Postgres.
> **Warning:** FK cycles detected — use `--disable-triggers` on restore.

## Prerequisites

1. Local schema must exist (Flyway migrations or full schema dump from remote).
2. Use `REMOTE_DATABASE_URL` for dump, `DATABASE_URL` for restore.
3. Restore with triggers disabled if FK order conflicts occur.

## Recommended import (by schema layer)

```text
1. etl, stats          (pipeline metadata, few dependencies)
2. master              (reference dimensions: continents → countries → leagues → teams → players)
3. matches             (fixtures and match facts)
4. raw                 (optional — large staging tables, mostly empty)
5. public              (app tables: waitlist)
```

## Full table order (65 tables)

```bash
pg_dump "$REMOTE_DATABASE_URL" \
  --data-only --no-owner --no-acl --disable-triggers \
  -t etl.batch_run \
  -t etl.watermark \
  -t master.continents \
  -t master.countries \
  -t master.leagues \
  -t master.legends \
  -t master.officials \
  -t master.player_career_stats \
  -t master.players \
  -t master.positions \
  -t master.score_outcomes \
  -t master.scoreboard_innings \
  -t master.seasons \
  -t master.stages \
  -t master.standings \
  -t master.team_rankings \
  -t master.team_squad_members \
  -t master.teams \
  -t master.venues \
  -t matches.fixture_balls \
  -t matches.fixture_batting \
  -t matches.fixture_bowling \
  -t matches.fixture_inning_overs \
  -t matches.fixture_lineups \
  -t matches.fixture_odds \
  -t matches.fixture_runs \
  -t matches.fixture_scoreboards \
  -t matches.fixture_weather \
  -t matches.fixtures \
  -t matches.livescore_snapshots \
  -t public.cricket_matches \
  -t public.flyway_schema_history \
  -t public.teams \
  -t public.waitlist \
  -t raw.api_ingest \
  -t raw.continents \
  -t raw.countries \
  -t raw.cricket_all_matches \
  -t raw.fixture_includes \
  -t raw.fixtures \
  -t raw.id_fixture_includes \
  -t raw.id_player_career \
  -t raw.id_squads \
  -t raw.id_standings_season \
  -t raw.id_standings_stage \
  -t raw.ipl_matches \
  -t raw.leagues \
  -t raw.livescores \
  -t raw.officials \
  -t raw.player_career \
  -t raw.players \
  -t raw.positions \
  -t raw.scores \
  -t raw.seasons \
  -t raw.squads \
  -t raw.stages \
  -t raw.standings_season \
  -t raw.standings_stage \
  -t raw.team_rankings \
  -t raw.teams \
  -t raw.venues \
  -t stats.fetch_run_details \
  -t stats.fetch_runs \
  -t stats.layer_count_runs \
  -t stats.table_row_counts \
  -f remote_data.sql

psql "$DATABASE_URL" -f remote_data.sql
```

## Tables by recommended batch

### etl (2)

- `etl.batch_run` (~8 rows)
- `etl.watermark` (~35 rows)

### stats (4)

- `stats.fetch_run_details` (~35,937 rows)
- `stats.fetch_runs` (~4 rows)
- `stats.layer_count_runs` (~8 rows)
- `stats.table_row_counts` (~799 rows)

### master (17)

- `master.continents` (~7 rows)
- `master.countries` (~244 rows)
- `master.leagues` (~435 rows)
- `master.legends` (~612 rows)
- `master.officials` (~1,405 rows)
- `master.player_career_stats` (~73,645 rows)
- `master.players` (~23,258 rows)
- `master.positions` (~8 rows)
- `master.score_outcomes` (~103 rows)
- `master.scoreboard_innings` (~0 rows)
- `master.seasons` (~596 rows)
- `master.stages` (~893 rows)
- `master.standings` (~1,439 rows)
- `master.team_rankings` (~0 rows)
- `master.team_squad_members` (~33,203 rows)
- `master.teams` (~288 rows)
- `master.venues` (~610 rows)

### matches (11)

- `matches.fixture_balls` (~86,790 rows)
- `matches.fixture_batting` (~13,783 rows)
- `matches.fixture_bowling` (~41,465 rows)
- `matches.fixture_inning_overs` (~13,976 rows)
- `matches.fixture_lineups` (~9,170 rows)
- `matches.fixture_odds` (~0 rows)
- `matches.fixture_runs` (~820 rows)
- `matches.fixture_scoreboards` (~0 rows)
- `matches.fixture_weather` (~0 rows)
- `matches.fixtures` (~7,935 rows)
- `matches.livescore_snapshots` (~0 rows)

### raw (27)

- `raw.api_ingest` (~0 rows)
- `raw.continents` (~0 rows)
- `raw.countries` (~0 rows)
- `raw.cricket_all_matches` (~22,228 rows)
- `raw.fixture_includes` (~48,927 rows)
- `raw.fixtures` (~0 rows)
- `raw.id_fixture_includes` (~0 rows)
- `raw.id_player_career` (~0 rows)
- `raw.id_squads` (~0 rows)
- `raw.id_standings_season` (~0 rows)
- `raw.id_standings_stage` (~0 rows)
- `raw.ipl_matches` (~1,243 rows)
- `raw.leagues` (~0 rows)
- `raw.livescores` (~0 rows)
- `raw.officials` (~0 rows)
- `raw.player_career` (~0 rows)
- `raw.players` (~0 rows)
- `raw.positions` (~0 rows)
- `raw.scores` (~0 rows)
- `raw.seasons` (~0 rows)
- `raw.squads` (~0 rows)
- `raw.stages` (~0 rows)
- `raw.standings_season` (~0 rows)
- `raw.standings_stage` (~0 rows)
- `raw.team_rankings` (~0 rows)
- `raw.teams` (~0 rows)
- `raw.venues` (~0 rows)

### public (4)

- `public.cricket_matches` (~0 rows)
- `public.flyway_schema_history` (~2 rows)
- `public.teams` (~0 rows)
- `public.waitlist` (~0 rows)

