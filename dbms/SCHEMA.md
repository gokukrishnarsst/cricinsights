# Database Schema Reference

> Auto-generated from remote snapshot `2026-07-15_schema.raw.json` on 2026-07-15 11:10:25.657404+00.
> Database: `cricket_ai_dev` | Engine: PostgreSQL (Aurora) | Access: read-only (`read_only_user`)

## Overview

| Metric | Count |
|--------|------:|
| Schemas | 7 |
| Base tables | 65 |
| Views | 22 |
| Foreign keys | 82 |
| Indexes | 189 |

## Schema layers

| Schema | Role | Tables | Views |
|--------|------|-------:|------:|
| `etl` | ETL pipeline bookkeeping (batch runs and watermarks) | 2 | 0 |
| `gold` | Analytics layer — denormalized dimension/fact views over master and matches | 0 | 21 |
| `master` | Curated reference and dimension data (teams, players, leagues, etc | 17 | 0 |
| `matches` | Match-centric transactional data (fixtures, ball-by-ball, lineups) | 11 | 0 |
| `public` | Application-facing tables managed by Flyway in this repo | 4 | 0 |
| `raw` | Raw API ingest staging tables from SportMonks and other sources | 27 | 0 |
| `stats` | Operational statistics about data fetch runs and table row counts | 4 | 1 |

---

## Schema: `etl`

### `etl.batch_run`

**Purpose:** ETL pipeline bookkeeping (batch runs and watermarks).

**Approx rows:** 8

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | uuidv7() | PK |
| `pipeline_name` | text | NO |  | PII |
| `layer` | text | NO | 'matches'::text |  |
| `started_at` | timestamp with time zone | NO | now() |  |
| `finished_at` | timestamp with time zone | YES |  |  |
| `status` | text | NO | 'RUNNING'::text |  |
| `records_read` | bigint | YES | 0 |  |
| `records_written` | bigint | YES | 0 |  |
| `error_message` | text | YES |  |  |

**Indexes:**

- `batch_run_pkey`: `CREATE UNIQUE INDEX batch_run_pkey ON etl.batch_run USING btree (id)`

---

### `etl.watermark`

**Purpose:** ETL pipeline bookkeeping (batch runs and watermarks).

**Approx rows:** 35

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('etl.watermark_id_seq'::regclass) | PK |
| `entity_name` | text | NO |  | PII |
| `last_loaded_at` | timestamp with time zone | YES |  |  |
| `last_run_at` | timestamp with time zone | NO | now() |  |
| `last_batch_id` | uuid | YES |  | FK → `etl.batch_run.id` |
| `rows_written` | bigint | YES | 0 |  |

**Indexes:**

- `idx_etl_watermark_entity`: `CREATE INDEX idx_etl_watermark_entity ON etl.watermark USING btree (entity_name)`
- `watermark_entity_name_key`: `CREATE UNIQUE INDEX watermark_entity_name_key ON etl.watermark USING btree (entity_name)`
- `watermark_pkey`: `CREATE UNIQUE INDEX watermark_pkey ON etl.watermark USING btree (id)`

**Foreign keys:**

- `last_batch_id` → `etl.batch_run.id` (ON UPDATE NO ACTION, ON DELETE SET NULL)

---

## Schema: `gold`

### Views in `gold`

- `dim_continent` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_country` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_date` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_league` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_official` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_player` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_position` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_season` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_stage` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_team` — Analytics layer — denormalized dimension/fact views over master and matches.
- `dim_venue` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_ball` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_batting` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_bowling` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_fixture` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_fixture_run` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_lineup` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_player_career` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_standing` — Analytics layer — denormalized dimension/fact views over master and matches.
- `fact_team_ranking` — Analytics layer — denormalized dimension/fact views over master and matches.
- `v_fixture_summary` — Analytics layer — denormalized dimension/fact views over master and matches.

---

## Schema: `master`

### `master.continents`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 7

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.continents_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `name` | text | NO |  | PII |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `continents__reorder_pkey`: `CREATE UNIQUE INDEX continents__reorder_pkey ON master.continents USING btree (id)`
- `uq_continents_uuid`: `CREATE UNIQUE INDEX uq_continents_uuid ON master.continents USING btree (uuid)`
- `uq_ref_continents_sportmonks`: `CREATE UNIQUE INDEX uq_ref_continents_sportmonks ON master.continents USING btree (sportmonks_id)`

---

### `master.countries`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 244

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.countries_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `continent_id` | bigint | YES |  | FK → `master.continents.sportmonks_id` |
| `name` | text | NO |  | PII |
| `image_path` | text | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `countries__reorder_pkey`: `CREATE UNIQUE INDEX countries__reorder_pkey ON master.countries USING btree (id)`
- `idx_ref_countries_continent`: `CREATE INDEX idx_ref_countries_continent ON master.countries USING btree (continent_id)`
- `uq_countries_uuid`: `CREATE UNIQUE INDEX uq_countries_uuid ON master.countries USING btree (uuid)`
- `uq_ref_countries_sportmonks`: `CREATE UNIQUE INDEX uq_ref_countries_sportmonks ON master.countries USING btree (sportmonks_id)`

**Foreign keys:**

- `continent_id` → `master.continents.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.leagues`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 435

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.leagues_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `active_season_id` | bigint | YES |  | FK → `master.seasons.sportmonks_id` |
| `country_id` | bigint | YES |  | FK → `master.countries.sportmonks_id` |
| `name` | text | NO |  | PII |
| `code` | text | YES |  |  |
| `image_path` | text | YES |  |  |
| `league_type` | text | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_leagues_country`: `CREATE INDEX idx_ref_leagues_country ON master.leagues USING btree (country_id)`
- `leagues__reorder_pkey`: `CREATE UNIQUE INDEX leagues__reorder_pkey ON master.leagues USING btree (id)`
- `uq_leagues_uuid`: `CREATE UNIQUE INDEX uq_leagues_uuid ON master.leagues USING btree (uuid)`
- `uq_ref_leagues_sportmonks`: `CREATE UNIQUE INDEX uq_ref_leagues_sportmonks ON master.leagues USING btree (sportmonks_id)`

**Foreign keys:**

- `active_season_id` → `master.seasons.sportmonks_id` (ON UPDATE CASCADE, ON DELETE SET NULL)
- `country_id` → `master.countries.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.legends`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 612

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.legends_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `stage_id` | bigint | YES |  | FK → `master.stages.sportmonks_id` |
| `season_id` | bigint | YES |  | FK → `master.seasons.sportmonks_id` |
| `league_id` | bigint | YES |  | FK → `master.leagues.sportmonks_id` |
| `position` | integer | YES |  |  |
| `description` | text | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `legends__reorder_pkey`: `CREATE UNIQUE INDEX legends__reorder_pkey ON master.legends USING btree (id)`
- `uq_legends_uuid`: `CREATE UNIQUE INDEX uq_legends_uuid ON master.legends USING btree (uuid)`
- `uq_ref_legends_sportmonks`: `CREATE UNIQUE INDEX uq_ref_legends_sportmonks ON master.legends USING btree (sportmonks_id)`

**Foreign keys:**

- `league_id` → `master.leagues.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `season_id` → `master.seasons.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `stage_id` → `master.stages.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.officials`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 1,405

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.officials_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `country_id` | bigint | YES |  | FK → `master.countries.sportmonks_id` |
| `firstname` | text | YES |  | PII |
| `lastname` | text | YES |  | PII |
| `fullname` | text | NO |  | PII |
| `dateofbirth` | date | YES |  |  |
| `gender` | text | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `officials__reorder_pkey`: `CREATE UNIQUE INDEX officials__reorder_pkey ON master.officials USING btree (id)`
- `uq_officials_uuid`: `CREATE UNIQUE INDEX uq_officials_uuid ON master.officials USING btree (uuid)`
- `uq_ref_officials_sportmonks`: `CREATE UNIQUE INDEX uq_ref_officials_sportmonks ON master.officials USING btree (sportmonks_id)`

**Foreign keys:**

- `country_id` → `master.countries.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.player_career_stats`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 73,645

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.player_career_stats_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `player_id` | bigint | NO |  | FK → `master.players.sportmonks_id` |
| `season_id` | bigint | NO |  | FK → `master.seasons.sportmonks_id` |
| `format_type` | text | NO |  |  |
| `batting_matches` | integer | YES |  |  |
| `batting_innings` | integer | YES |  |  |
| `batting_runs` | integer | YES |  |  |
| `batting_not_outs` | integer | YES |  |  |
| `batting_highest_score` | integer | YES |  |  |
| `batting_strike_rate` | numeric | YES |  |  |
| `batting_balls_faced` | integer | YES |  |  |
| `batting_average` | numeric | YES |  |  |
| `batting_fours` | integer | YES |  |  |
| `batting_sixes` | integer | YES |  |  |
| `batting_fifties` | integer | YES |  |  |
| `batting_hundreds` | integer | YES |  |  |
| `batting_fow_score` | integer | YES |  |  |
| `batting_fow_balls` | numeric | YES |  |  |
| `bowling_matches` | integer | YES |  |  |
| `bowling_overs` | numeric | YES |  |  |
| `bowling_innings` | integer | YES |  |  |
| `bowling_average` | numeric | YES |  |  |
| `bowling_economy_rate` | numeric | YES |  |  |
| `bowling_maidens` | integer | YES |  |  |
| `bowling_runs` | integer | YES |  |  |
| `bowling_wickets` | integer | YES |  |  |
| `bowling_wides` | integer | YES |  |  |
| `bowling_noballs` | integer | YES |  |  |
| `bowling_strike_rate` | numeric | YES |  |  |
| `bowling_four_wickets` | integer | YES |  |  |
| `bowling_five_wickets` | integer | YES |  |  |
| `bowling_ten_wickets` | integer | YES |  |  |
| `bowling_rate` | numeric | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `player_career_stats__reorder_pkey`: `CREATE UNIQUE INDEX player_career_stats__reorder_pkey ON master.player_career_stats USING btree (id)`
- `uq_player_career`: `CREATE UNIQUE INDEX uq_player_career ON master.player_career_stats USING btree (player_id, season_id, format_type)`
- `uq_player_career_stats_uuid`: `CREATE UNIQUE INDEX uq_player_career_stats_uuid ON master.player_career_stats USING btree (uuid)`

**Foreign keys:**

- `player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `season_id` → `master.seasons.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.players`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.). Player master records.

**Approx rows:** 23,258

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.players_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `country_id` | bigint | YES |  | FK → `master.countries.sportmonks_id` |
| `position_id` | bigint | YES |  | FK → `master.positions.sportmonks_id` |
| `firstname` | text | YES |  | PII |
| `lastname` | text | YES |  | PII |
| `fullname` | text | NO |  | PII |
| `image_path` | text | YES |  |  |
| `dateofbirth` | date | YES |  |  |
| `gender` | text | YES |  |  |
| `battingstyle` | text | YES |  |  |
| `bowlingstyle` | text | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_players_active`: `CREATE INDEX idx_ref_players_active ON master.players USING btree (sportmonks_id) WHERE (is_active = true)`
- `idx_ref_players_country`: `CREATE INDEX idx_ref_players_country ON master.players USING btree (country_id)`
- `idx_ref_players_position`: `CREATE INDEX idx_ref_players_position ON master.players USING btree (position_id)`
- `players__reorder_pkey`: `CREATE UNIQUE INDEX players__reorder_pkey ON master.players USING btree (id)`
- `uq_players_uuid`: `CREATE UNIQUE INDEX uq_players_uuid ON master.players USING btree (uuid)`
- `uq_ref_players_sportmonks`: `CREATE UNIQUE INDEX uq_ref_players_sportmonks ON master.players USING btree (sportmonks_id)`

**Foreign keys:**

- `country_id` → `master.countries.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `position_id` → `master.positions.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.positions`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 8

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.positions_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `name` | text | NO |  | PII |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `positions__reorder_pkey`: `CREATE UNIQUE INDEX positions__reorder_pkey ON master.positions USING btree (id)`
- `uq_positions_uuid`: `CREATE UNIQUE INDEX uq_positions_uuid ON master.positions USING btree (uuid)`
- `uq_ref_positions_sportmonks`: `CREATE UNIQUE INDEX uq_ref_positions_sportmonks ON master.positions USING btree (sportmonks_id)`

---

### `master.score_outcomes`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 103

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.score_outcomes_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `name` | text | NO |  | PII |
| `runs` | integer | NO | 0 |  |
| `is_four` | boolean | NO | false |  |
| `is_six` | boolean | NO | false |  |
| `bye` | integer | NO | 0 |  |
| `leg_bye` | integer | NO | 0 |  |
| `noball` | integer | NO | 0 |  |
| `noball_runs` | integer | NO | 0 |  |
| `is_wicket` | boolean | NO | false |  |
| `is_ball` | boolean | NO | true |  |
| `is_out` | boolean | NO | false |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `score_outcomes__reorder_pkey`: `CREATE UNIQUE INDEX score_outcomes__reorder_pkey ON master.score_outcomes USING btree (id)`
- `uq_ref_score_outcomes_sportmonks`: `CREATE UNIQUE INDEX uq_ref_score_outcomes_sportmonks ON master.score_outcomes USING btree (sportmonks_id)`
- `uq_score_outcomes_uuid`: `CREATE UNIQUE INDEX uq_score_outcomes_uuid ON master.score_outcomes USING btree (uuid)`

---

### `master.scoreboard_innings`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `code` | text | NO |  | PK |
| `inning_number` | smallint | NO |  |  |
| `description` | text | NO |  |  |

**Indexes:**

- `scoreboard_innings_pkey`: `CREATE UNIQUE INDEX scoreboard_innings_pkey ON master.scoreboard_innings USING btree (code)`

---

### `master.seasons`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 596

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.seasons_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `league_id` | bigint | NO |  | FK → `master.leagues.sportmonks_id` |
| `name` | text | NO |  | PII |
| `code` | text | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_seasons_league`: `CREATE INDEX idx_ref_seasons_league ON master.seasons USING btree (league_id)`
- `seasons__reorder_pkey`: `CREATE UNIQUE INDEX seasons__reorder_pkey ON master.seasons USING btree (id)`
- `uq_ref_seasons_sportmonks`: `CREATE UNIQUE INDEX uq_ref_seasons_sportmonks ON master.seasons USING btree (sportmonks_id)`
- `uq_seasons_uuid`: `CREATE UNIQUE INDEX uq_seasons_uuid ON master.seasons USING btree (uuid)`

**Foreign keys:**

- `league_id` → `master.leagues.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.stages`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 893

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.stages_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `league_id` | bigint | NO |  | FK → `master.leagues.sportmonks_id` |
| `season_id` | bigint | NO |  | FK → `master.seasons.sportmonks_id` |
| `name` | text | NO |  | PII |
| `code` | text | YES |  |  |
| `stage_type` | text | YES |  |  |
| `has_standings` | boolean | NO | false |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_stages_season`: `CREATE INDEX idx_ref_stages_season ON master.stages USING btree (season_id, league_id)`
- `stages__reorder_pkey`: `CREATE UNIQUE INDEX stages__reorder_pkey ON master.stages USING btree (id)`
- `uq_ref_stages_sportmonks`: `CREATE UNIQUE INDEX uq_ref_stages_sportmonks ON master.stages USING btree (sportmonks_id)`
- `uq_stages_uuid`: `CREATE UNIQUE INDEX uq_stages_uuid ON master.stages USING btree (uuid)`

**Foreign keys:**

- `league_id` → `master.leagues.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `season_id` → `master.seasons.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.standings`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 1,439

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.standings_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `stage_id` | bigint | NO |  | FK → `master.stages.sportmonks_id` |
| `season_id` | bigint | NO |  | FK → `master.seasons.sportmonks_id` |
| `league_id` | bigint | NO |  | FK → `master.leagues.sportmonks_id` |
| `legend_id` | bigint | YES |  | FK → `master.legends.sportmonks_id` |
| `position` | integer | YES |  |  |
| `points` | integer | YES |  |  |
| `played` | integer | YES |  |  |
| `won` | integer | YES |  |  |
| `lost` | integer | YES |  |  |
| `draw` | integer | YES |  |  |
| `noresult` | integer | YES |  |  |
| `runs_for` | integer | YES |  |  |
| `overs_for` | numeric | YES |  |  |
| `runs_against` | integer | YES |  |  |
| `overs_against` | numeric | YES |  |  |
| `net_run_rate` | numeric | YES |  |  |
| `recent_form` | ARRAY | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_standings_season_team`: `CREATE INDEX idx_ref_standings_season_team ON master.standings USING btree (season_id, team_id)`
- `idx_ref_standings_stage`: `CREATE INDEX idx_ref_standings_stage ON master.standings USING btree (stage_id)`
- `standings__reorder_pkey`: `CREATE UNIQUE INDEX standings__reorder_pkey ON master.standings USING btree (id)`
- `uq_standings`: `CREATE UNIQUE INDEX uq_standings ON master.standings USING btree (season_id, stage_id, team_id)`
- `uq_standings_uuid`: `CREATE UNIQUE INDEX uq_standings_uuid ON master.standings USING btree (uuid)`

**Foreign keys:**

- `league_id` → `master.leagues.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `legend_id` → `master.legends.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `season_id` → `master.seasons.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `stage_id` → `master.stages.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.team_rankings`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.team_rankings_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `format_type` | text | NO |  |  |
| `gender` | text | NO |  |  |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `position` | integer | YES |  |  |
| `points` | numeric | YES |  |  |
| `rating` | numeric | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `team_rankings__reorder_pkey`: `CREATE UNIQUE INDEX team_rankings__reorder_pkey ON master.team_rankings USING btree (id)`
- `uq_team_ranking`: `CREATE UNIQUE INDEX uq_team_ranking ON master.team_rankings USING btree (format_type, gender, team_id)`
- `uq_team_rankings_uuid`: `CREATE UNIQUE INDEX uq_team_rankings_uuid ON master.team_rankings USING btree (uuid)`

**Foreign keys:**

- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.team_squad_members`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 33,203

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.team_squad_members_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `player_id` | bigint | NO |  | FK → `master.players.sportmonks_id` |
| `season_id` | bigint | NO |  | FK → `master.seasons.sportmonks_id` |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_squad_team_season`: `CREATE INDEX idx_ref_squad_team_season ON master.team_squad_members USING btree (team_id, season_id)`
- `team_squad_members__reorder_pkey`: `CREATE UNIQUE INDEX team_squad_members__reorder_pkey ON master.team_squad_members USING btree (id)`
- `uq_team_squad`: `CREATE UNIQUE INDEX uq_team_squad ON master.team_squad_members USING btree (team_id, player_id, season_id)`
- `uq_team_squad_members_uuid`: `CREATE UNIQUE INDEX uq_team_squad_members_uuid ON master.team_squad_members USING btree (uuid)`

**Foreign keys:**

- `player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `season_id` → `master.seasons.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.teams`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.). Team master records.

**Approx rows:** 288

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.teams_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `country_id` | bigint | YES |  | FK → `master.countries.sportmonks_id` |
| `name` | text | NO |  | PII |
| `code` | text | YES |  |  |
| `image_path` | text | YES |  |  |
| `national_team` | boolean | NO | false |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_teams_country`: `CREATE INDEX idx_ref_teams_country ON master.teams USING btree (country_id)`
- `teams__reorder_pkey`: `CREATE UNIQUE INDEX teams__reorder_pkey ON master.teams USING btree (id)`
- `uq_ref_teams_sportmonks`: `CREATE UNIQUE INDEX uq_ref_teams_sportmonks ON master.teams USING btree (sportmonks_id)`
- `uq_teams_uuid`: `CREATE UNIQUE INDEX uq_teams_uuid ON master.teams USING btree (uuid)`

**Foreign keys:**

- `country_id` → `master.countries.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `master.venues`

**Purpose:** Curated reference and dimension data (teams, players, leagues, etc.).

**Approx rows:** 610

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('master.venues_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `country_id` | bigint | YES |  | FK → `master.countries.sportmonks_id` |
| `name` | text | NO |  | PII |
| `city` | text | YES |  |  |
| `image_path` | text | YES |  |  |
| `capacity` | integer | YES |  |  |
| `floodlight` | boolean | NO | false |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_ref_venues_country`: `CREATE INDEX idx_ref_venues_country ON master.venues USING btree (country_id)`
- `uq_ref_venues_sportmonks`: `CREATE UNIQUE INDEX uq_ref_venues_sportmonks ON master.venues USING btree (sportmonks_id)`
- `uq_venues_uuid`: `CREATE UNIQUE INDEX uq_venues_uuid ON master.venues USING btree (uuid)`
- `venues__reorder_pkey`: `CREATE UNIQUE INDEX venues__reorder_pkey ON master.venues USING btree (id)`

**Foreign keys:**

- `country_id` → `master.countries.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

## Schema: `matches`

### `matches.fixture_balls`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups). Ball-by-ball delivery events.

**Approx rows:** 86,790

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_balls_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `ball_number` | numeric | NO |  |  |
| `scoreboard` | text | YES |  |  |
| `batsman_striker_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `batsman_non_striker_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `batsman_scorer_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `bowler_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `batsman_out_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `catch_stump_player_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `runout_by_player_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `score_outcome_id` | bigint | YES |  | FK → `master.score_outcomes.sportmonks_id` |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_balls__reorder_pkey`: `CREATE UNIQUE INDEX fixture_balls__reorder_pkey ON matches.fixture_balls USING btree (id)`
- `idx_fixture_balls_brin_created`: `CREATE INDEX idx_fixture_balls_brin_created ON matches.fixture_balls USING brin (created_at)`
- `idx_fixture_balls_fixture_ball`: `CREATE INDEX idx_fixture_balls_fixture_ball ON matches.fixture_balls USING btree (fixture_id, ball_number)`
- `idx_fixture_balls_fixture_scoreboard`: `CREATE INDEX idx_fixture_balls_fixture_scoreboard ON matches.fixture_balls USING btree (fixture_id, scoreboard)`
- `uq_fixture_balls`: `CREATE UNIQUE INDEX uq_fixture_balls ON matches.fixture_balls USING btree (sportmonks_id)`
- `uq_fixture_balls_uuid`: `CREATE UNIQUE INDEX uq_fixture_balls_uuid ON matches.fixture_balls USING btree (uuid)`

**Foreign keys:**

- `batsman_non_striker_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `batsman_out_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `batsman_scorer_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `batsman_striker_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `bowler_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `catch_stump_player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `runout_by_player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `score_outcome_id` → `master.score_outcomes.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_batting`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 13,783

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_batting_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `player_id` | bigint | NO |  | FK → `master.players.sportmonks_id` |
| `sort_order` | integer | YES |  |  |
| `is_active` | boolean | NO | false |  |
| `scoreboard` | text | YES |  |  |
| `runs_scored` | integer | YES |  |  |
| `balls_faced` | integer | YES |  |  |
| `fours` | integer | NO | 0 |  |
| `sixes` | integer | NO | 0 |  |
| `strike_rate` | numeric | YES |  |  |
| `wicket_outcome_id` | bigint | YES |  | FK → `master.score_outcomes.sportmonks_id` |
| `score_outcome_id` | bigint | YES |  | FK → `master.score_outcomes.sportmonks_id` |
| `catch_stump_player_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `runout_by_player_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `batsman_out_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `bowling_player_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `fow_score` | integer | YES |  |  |
| `fow_balls` | numeric | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_batting__reorder_pkey`: `CREATE UNIQUE INDEX fixture_batting__reorder_pkey ON matches.fixture_batting USING btree (id)`
- `idx_fixture_batting_fixture_player`: `CREATE INDEX idx_fixture_batting_fixture_player ON matches.fixture_batting USING btree (fixture_id, player_id)`
- `uq_fixture_batting`: `CREATE UNIQUE INDEX uq_fixture_batting ON matches.fixture_batting USING btree (sportmonks_id)`
- `uq_fixture_batting_uuid`: `CREATE UNIQUE INDEX uq_fixture_batting_uuid ON matches.fixture_batting USING btree (uuid)`

**Foreign keys:**

- `batsman_out_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `bowling_player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `catch_stump_player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `runout_by_player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `score_outcome_id` → `master.score_outcomes.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `wicket_outcome_id` → `master.score_outcomes.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_bowling`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 41,465

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_bowling_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `player_id` | bigint | NO |  | FK → `master.players.sportmonks_id` |
| `sort_order` | integer | YES |  |  |
| `is_active` | boolean | NO | false |  |
| `scoreboard` | text | YES |  |  |
| `overs` | numeric | YES |  |  |
| `maidens` | integer | NO | 0 |  |
| `runs_conceded` | integer | NO | 0 |  |
| `wickets` | integer | NO | 0 |  |
| `wides` | integer | NO | 0 |  |
| `noballs` | integer | NO | 0 |  |
| `economy_rate` | numeric | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_bowling__reorder_pkey`: `CREATE UNIQUE INDEX fixture_bowling__reorder_pkey ON matches.fixture_bowling USING btree (id)`
- `idx_fixture_bowling_fixture_player`: `CREATE INDEX idx_fixture_bowling_fixture_player ON matches.fixture_bowling USING btree (fixture_id, player_id)`
- `uq_fixture_bowling`: `CREATE UNIQUE INDEX uq_fixture_bowling ON matches.fixture_bowling USING btree (sportmonks_id)`
- `uq_fixture_bowling_uuid`: `CREATE UNIQUE INDEX uq_fixture_bowling_uuid ON matches.fixture_bowling USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_inning_overs`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 13,976

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_inning_overs_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `scoreboard` | text | NO |  |  |
| `over_number` | integer | NO |  |  |
| `runs_in_over` | integer | NO | 0 |  |
| `wickets_in_over` | integer | NO | 0 |  |
| `bowler_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_inning_overs__reorder_pkey`: `CREATE UNIQUE INDEX fixture_inning_overs__reorder_pkey ON matches.fixture_inning_overs USING btree (id)`
- `idx_fixture_inning_overs_fixture`: `CREATE INDEX idx_fixture_inning_overs_fixture ON matches.fixture_inning_overs USING btree (fixture_id, scoreboard, over_number)`
- `uq_fixture_inning_overs`: `CREATE UNIQUE INDEX uq_fixture_inning_overs ON matches.fixture_inning_overs USING btree (fixture_id, team_id, scoreboard, over_number)`
- `uq_fixture_inning_overs_uuid`: `CREATE UNIQUE INDEX uq_fixture_inning_overs_uuid ON matches.fixture_inning_overs USING btree (uuid)`

**Foreign keys:**

- `bowler_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_lineups`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 9,170

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_lineups_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `player_id` | bigint | NO |  | FK → `master.players.sportmonks_id` |
| `is_captain` | boolean | NO | false |  |
| `is_wicketkeeper` | boolean | NO | false |  |
| `is_substitute` | boolean | NO | false |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_lineups__reorder_pkey`: `CREATE UNIQUE INDEX fixture_lineups__reorder_pkey ON matches.fixture_lineups USING btree (id)`
- `idx_fixture_lineups_fixture`: `CREATE INDEX idx_fixture_lineups_fixture ON matches.fixture_lineups USING btree (fixture_id)`
- `uq_fixture_lineups`: `CREATE UNIQUE INDEX uq_fixture_lineups ON matches.fixture_lineups USING btree (fixture_id, team_id, player_id)`
- `uq_fixture_lineups_uuid`: `CREATE UNIQUE INDEX uq_fixture_lineups_uuid ON matches.fixture_lineups USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `player_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_odds`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_odds_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `odds_json` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_odds__reorder_pkey`: `CREATE UNIQUE INDEX fixture_odds__reorder_pkey ON matches.fixture_odds USING btree (id)`
- `idx_fixture_odds_gin`: `CREATE INDEX idx_fixture_odds_gin ON matches.fixture_odds USING gin (odds_json)`
- `uq_fixture_odds_uuid`: `CREATE UNIQUE INDEX uq_fixture_odds_uuid ON matches.fixture_odds USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_runs`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 820

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_runs_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `inning` | smallint | NO |  |  |
| `score` | integer | YES |  |  |
| `wickets` | integer | YES |  |  |
| `overs` | numeric | YES |  |  |
| `powerplay_1` | text | YES |  |  |
| `powerplay_2` | text | YES |  |  |
| `powerplay_3` | text | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_runs__reorder_pkey`: `CREATE UNIQUE INDEX fixture_runs__reorder_pkey ON matches.fixture_runs USING btree (id)`
- `idx_fixture_runs_fixture`: `CREATE INDEX idx_fixture_runs_fixture ON matches.fixture_runs USING btree (fixture_id)`
- `uq_fixture_runs`: `CREATE UNIQUE INDEX uq_fixture_runs ON matches.fixture_runs USING btree (sportmonks_id)`
- `uq_fixture_runs_uuid`: `CREATE UNIQUE INDEX uq_fixture_runs_uuid ON matches.fixture_runs USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_scoreboards`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_scoreboards_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `team_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `scoreboard` | text | NO |  |  |
| `board_type` | text | YES |  |  |
| `wides` | integer | NO | 0 |  |
| `noball_runs` | integer | NO | 0 |  |
| `noball_balls` | integer | NO | 0 |  |
| `byes` | integer | NO | 0 |  |
| `leg_byes` | integer | NO | 0 |  |
| `penalty` | integer | NO | 0 |  |
| `total_runs` | integer | NO | 0 |  |
| `overs` | numeric | YES |  |  |
| `wickets` | integer | NO | 0 |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_scoreboards__reorder_pkey`: `CREATE UNIQUE INDEX fixture_scoreboards__reorder_pkey ON matches.fixture_scoreboards USING btree (id)`
- `uq_fixture_scoreboards`: `CREATE UNIQUE INDEX uq_fixture_scoreboards ON matches.fixture_scoreboards USING btree (sportmonks_id)`
- `uq_fixture_scoreboards_uuid`: `CREATE UNIQUE INDEX uq_fixture_scoreboards_uuid ON matches.fixture_scoreboards USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixture_weather`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixture_weather_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `report_sequence` | smallint | NO | 1 |  |
| `weather_json` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_weather__reorder_pkey`: `CREATE UNIQUE INDEX fixture_weather__reorder_pkey ON matches.fixture_weather USING btree (id)`
- `idx_fixture_weather_gin`: `CREATE INDEX idx_fixture_weather_gin ON matches.fixture_weather USING gin (weather_json)`
- `uq_fixture_weather`: `CREATE UNIQUE INDEX uq_fixture_weather ON matches.fixture_weather USING btree (fixture_id, report_sequence)`
- `uq_fixture_weather_uuid`: `CREATE UNIQUE INDEX uq_fixture_weather_uuid ON matches.fixture_weather USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.fixtures`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups). Core match/fixture records.

**Approx rows:** 7,935

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.fixtures_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `sportmonks_id` | bigint | NO |  |  |
| `league_id` | bigint | NO |  | FK → `master.leagues.sportmonks_id` |
| `season_id` | bigint | NO |  | FK → `master.seasons.sportmonks_id` |
| `stage_id` | bigint | YES |  | FK → `master.stages.sportmonks_id` |
| `round` | text | YES |  |  |
| `localteam_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `visitorteam_id` | bigint | NO |  | FK → `master.teams.sportmonks_id` |
| `starting_at` | timestamp with time zone | YES |  |  |
| `match_format` | text | YES |  |  |
| `is_live` | boolean | NO | false |  |
| `status` | text | YES |  |  |
| `last_period` | text | YES |  |  |
| `note` | text | YES |  |  |
| `venue_id` | bigint | YES |  | FK → `master.venues.sportmonks_id` |
| `toss_won_team_id` | bigint | YES |  | FK → `master.teams.sportmonks_id` |
| `winner_team_id` | bigint | YES |  | FK → `master.teams.sportmonks_id` |
| `draw_noresult` | text | YES |  |  |
| `first_umpire_id` | bigint | YES |  | FK → `master.officials.sportmonks_id` |
| `second_umpire_id` | bigint | YES |  | FK → `master.officials.sportmonks_id` |
| `tv_umpire_id` | bigint | YES |  | FK → `master.officials.sportmonks_id` |
| `referee_id` | bigint | YES |  | FK → `master.officials.sportmonks_id` |
| `man_of_match_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `man_of_series_id` | bigint | YES |  | FK → `master.players.sportmonks_id` |
| `total_overs_played` | integer | YES |  |  |
| `elected` | text | YES |  |  |
| `super_over` | boolean | NO | false |  |
| `follow_on` | boolean | NO | false |  |
| `localteam_dl_score` | integer | YES |  |  |
| `localteam_dl_overs` | numeric | YES |  |  |
| `localteam_dl_wickets` | integer | YES |  |  |
| `visitorteam_dl_score` | integer | YES |  |  |
| `visitorteam_dl_overs` | numeric | YES |  |  |
| `visitorteam_dl_wickets` | integer | YES |  |  |
| `visitorteam_dl_total_overs` | integer | YES |  |  |
| `rpc_overs` | numeric | YES |  |  |
| `rpc_target` | integer | YES |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `is_published` | boolean | NO | true |  |
| `is_active` | boolean | NO | true |  |
| `created_at` | timestamp with time zone | NO | now() |  |
| `updated_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixtures__reorder_pkey`: `CREATE UNIQUE INDEX fixtures__reorder_pkey ON matches.fixtures USING btree (id)`
- `idx_silver_fixtures_league`: `CREATE INDEX idx_silver_fixtures_league ON matches.fixtures USING btree (league_id)`
- `idx_silver_fixtures_live`: `CREATE INDEX idx_silver_fixtures_live ON matches.fixtures USING btree (is_live) WHERE (is_live = true)`
- `idx_silver_fixtures_localteam`: `CREATE INDEX idx_silver_fixtures_localteam ON matches.fixtures USING btree (localteam_id)`
- `idx_silver_fixtures_pbi_cover`: `CREATE INDEX idx_silver_fixtures_pbi_cover ON matches.fixtures USING btree (starting_at, league_id, season_id, localteam_id, visitorteam_id, winner_team_id, status)`
- `idx_silver_fixtures_season`: `CREATE INDEX idx_silver_fixtures_season ON matches.fixtures USING btree (season_id)`
- `idx_silver_fixtures_starting_at`: `CREATE INDEX idx_silver_fixtures_starting_at ON matches.fixtures USING btree (starting_at)`
- `idx_silver_fixtures_status`: `CREATE INDEX idx_silver_fixtures_status ON matches.fixtures USING btree (status) WHERE (status IS NOT NULL)`
- `idx_silver_fixtures_visitorteam`: `CREATE INDEX idx_silver_fixtures_visitorteam ON matches.fixtures USING btree (visitorteam_id)`
- `uq_fixtures_uuid`: `CREATE UNIQUE INDEX uq_fixtures_uuid ON matches.fixtures USING btree (uuid)`
- `uq_silver_fixtures_sportmonks`: `CREATE UNIQUE INDEX uq_silver_fixtures_sportmonks ON matches.fixtures USING btree (sportmonks_id)`

**Foreign keys:**

- `first_umpire_id` → `master.officials.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `league_id` → `master.leagues.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `localteam_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `man_of_match_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `man_of_series_id` → `master.players.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `referee_id` → `master.officials.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `season_id` → `master.seasons.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `second_umpire_id` → `master.officials.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `stage_id` → `master.stages.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `toss_won_team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `tv_umpire_id` → `master.officials.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `venue_id` → `master.venues.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `visitorteam_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `winner_team_id` → `master.teams.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `matches.livescore_snapshots`

**Purpose:** Match-centric transactional data (fixtures, ball-by-ball, lineups).

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('matches.livescore_snapshots_id_seq'::regclass) | PK |
| `uuid` | uuid | NO | uuidv7() |  |
| `fixture_id` | bigint | NO |  | FK → `matches.fixtures.sportmonks_id` |
| `snapshot_at` | timestamp with time zone | NO | now() |  |
| `status` | text | YES |  |  |
| `is_live` | boolean | NO |  |  |
| `payload_hash` | text | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `livescore_snapshots__reorder_pkey`: `CREATE UNIQUE INDEX livescore_snapshots__reorder_pkey ON matches.livescore_snapshots USING btree (id)`
- `uq_livescore_snapshots_uuid`: `CREATE UNIQUE INDEX uq_livescore_snapshots_uuid ON matches.livescore_snapshots USING btree (uuid)`

**Foreign keys:**

- `fixture_id` → `matches.fixtures.sportmonks_id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

## Schema: `public`

### `public.cricket_matches`

**Purpose:** Application-facing tables managed by Flyway in this repo.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | NO | nextval('cricket_matches_id_seq'::regclass) | PK |
| `home_team_id` | integer | YES |  | FK → `public.teams.id` |
| `away_team_id` | integer | YES |  | FK → `public.teams.id` |
| `match_date` | timestamp with time zone | NO |  |  |
| `venue` | character varying(255) | YES |  |  |
| `status` | character varying(50) | YES | 'scheduled'::character varying |  |
| `winner_team_id` | integer | YES |  | FK → `public.teams.id` |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Indexes:**

- `cricket_matches_pkey`: `CREATE UNIQUE INDEX cricket_matches_pkey ON public.cricket_matches USING btree (id)`

**Foreign keys:**

- `away_team_id` → `public.teams.id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `home_team_id` → `public.teams.id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)
- `winner_team_id` → `public.teams.id` (ON UPDATE NO ACTION, ON DELETE NO ACTION)

---

### `public.flyway_schema_history`

**Purpose:** Application-facing tables managed by Flyway in this repo. Flyway migration audit log.

**Approx rows:** 2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `installed_rank` | integer | NO |  | PK |
| `version` | character varying(50) | YES |  |  |
| `description` | character varying(200) | NO |  |  |
| `type` | character varying(20) | NO |  |  |
| `script` | character varying(1000) | NO |  |  |
| `checksum` | integer | YES |  |  |
| `installed_by` | character varying(100) | NO |  |  |
| `installed_on` | timestamp without time zone | NO | now() |  |
| `execution_time` | integer | NO |  |  |
| `success` | boolean | NO |  |  |

**Indexes:**

- `flyway_schema_history_pk`: `CREATE UNIQUE INDEX flyway_schema_history_pk ON public.flyway_schema_history USING btree (installed_rank)`
- `flyway_schema_history_s_idx`: `CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success)`

---

### `public.teams`

**Purpose:** Application-facing tables managed by Flyway in this repo. Team master records.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | NO | nextval('teams_id_seq'::regclass) | PK |
| `name` | character varying(100) | NO |  | PII |
| `code` | character varying(10) | YES |  |  |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Indexes:**

- `teams_code_key`: `CREATE UNIQUE INDEX teams_code_key ON public.teams USING btree (code)`
- `teams_name_key`: `CREATE UNIQUE INDEX teams_name_key ON public.teams USING btree (name)`
- `teams_pkey`: `CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id)`

---

### `public.waitlist`

**Purpose:** Application-facing tables managed by Flyway in this repo. CricInsights email waitlist signups.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | NO | nextval('waitlist_id_seq'::regclass) | PK |
| `email` | character varying(255) | NO |  | PII |
| `created_at` | timestamp with time zone | NO | CURRENT_TIMESTAMP |  |

**Indexes:**

- `idx_waitlist_created_at`: `CREATE INDEX idx_waitlist_created_at ON public.waitlist USING btree (created_at DESC)`
- `waitlist_email_unique`: `CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist USING btree (email)`
- `waitlist_pkey`: `CREATE UNIQUE INDEX waitlist_pkey ON public.waitlist USING btree (id)`

---

## Schema: `raw`

### `raw.api_ingest`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.api_ingest_id_seq'::regclass) | PK |
| `source_file` | text | YES |  |  |
| `payload` | jsonb | NO |  |  |
| `ingested_at` | timestamp with time zone | NO | now() |  |
| `checksum` | text | YES |  |  |

**Indexes:**

- `api_ingest_pkey`: `CREATE UNIQUE INDEX api_ingest_pkey ON raw.api_ingest USING btree (id)`

---

### `raw.continents`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_continents_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_continents_pkey`: `CREATE UNIQUE INDEX cricket_continents_pkey ON raw.continents USING btree (id)`
- `cricket_continents_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_continents_sportmonks_id_key ON raw.continents USING btree (sportmonks_id)`

---

### `raw.countries`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_countries_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_countries_pkey`: `CREATE UNIQUE INDEX cricket_countries_pkey ON raw.countries USING btree (id)`
- `cricket_countries_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_countries_sportmonks_id_key ON raw.countries USING btree (sportmonks_id)`
- `idx_raw_countries_data`: `CREATE INDEX idx_raw_countries_data ON raw.countries USING gin (data)`

---

### `raw.cricket_all_matches`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 22,228

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `info` | text | YES |  |  |
| `innings` | text | YES |  |  |
| `meta` | text | YES |  |  |

---

### `raw.fixture_includes`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 48,927

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.fixture_includes_id_seq'::regclass) | PK |
| `fixture_id` | bigint | NO |  |  |
| `include_param` | text | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fixture_includes_fixture_id_include_param_key`: `CREATE UNIQUE INDEX fixture_includes_fixture_id_include_param_key ON raw.fixture_includes USING btree (fixture_id, include_param)`
- `fixture_includes_pkey`: `CREATE UNIQUE INDEX fixture_includes_pkey ON raw.fixture_includes USING btree (id)`

---

### `raw.fixtures`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources. Core match/fixture records.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_fixtures_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_fixtures_pkey`: `CREATE UNIQUE INDEX cricket_fixtures_pkey ON raw.fixtures USING btree (id)`
- `cricket_fixtures_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_fixtures_sportmonks_id_key ON raw.fixtures USING btree (sportmonks_id)`
- `idx_raw_fixtures_data`: `CREATE INDEX idx_raw_fixtures_data ON raw.fixtures USING gin (data)`

---

### `raw.id_fixture_includes`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_id_fixture_includes_id_seq'::regclass) | PK |
| `fixture_id` | bigint | NO |  |  |
| `include_param` | text | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_id_fixture_includes_fixture_id_include_param_key`: `CREATE UNIQUE INDEX cricket_id_fixture_includes_fixture_id_include_param_key ON raw.id_fixture_includes USING btree (fixture_id, include_param)`
- `cricket_id_fixture_includes_pkey`: `CREATE UNIQUE INDEX cricket_id_fixture_includes_pkey ON raw.id_fixture_includes USING btree (id)`

---

### `raw.id_player_career`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_id_player_career_id_seq'::regclass) | PK |
| `player_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_id_player_career_pkey`: `CREATE UNIQUE INDEX cricket_id_player_career_pkey ON raw.id_player_career USING btree (id)`
- `cricket_id_player_career_player_id_key`: `CREATE UNIQUE INDEX cricket_id_player_career_player_id_key ON raw.id_player_career USING btree (player_id)`

---

### `raw.id_squads`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_id_squads_id_seq'::regclass) | PK |
| `team_id` | bigint | NO |  |  |
| `season_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_id_squads_pkey`: `CREATE UNIQUE INDEX cricket_id_squads_pkey ON raw.id_squads USING btree (id)`
- `cricket_id_squads_team_id_season_id_key`: `CREATE UNIQUE INDEX cricket_id_squads_team_id_season_id_key ON raw.id_squads USING btree (team_id, season_id)`

---

### `raw.id_standings_season`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_id_standings_season_id_seq'::regclass) | PK |
| `season_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_id_standings_season_pkey`: `CREATE UNIQUE INDEX cricket_id_standings_season_pkey ON raw.id_standings_season USING btree (id)`
- `cricket_id_standings_season_season_id_key`: `CREATE UNIQUE INDEX cricket_id_standings_season_season_id_key ON raw.id_standings_season USING btree (season_id)`

---

### `raw.id_standings_stage`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_id_standings_stage_id_seq'::regclass) | PK |
| `stage_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_id_standings_stage_pkey`: `CREATE UNIQUE INDEX cricket_id_standings_stage_pkey ON raw.id_standings_stage USING btree (id)`
- `cricket_id_standings_stage_stage_id_key`: `CREATE UNIQUE INDEX cricket_id_standings_stage_stage_id_key ON raw.id_standings_stage USING btree (stage_id)`

---

### `raw.ipl_matches`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 1,243

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `info` | jsonb | YES |  |  |
| `innings` | jsonb | YES |  |  |
| `meta` | jsonb | YES |  |  |

---

### `raw.leagues`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_leagues_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_leagues_pkey`: `CREATE UNIQUE INDEX cricket_leagues_pkey ON raw.leagues USING btree (id)`
- `cricket_leagues_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_leagues_sportmonks_id_key ON raw.leagues USING btree (sportmonks_id)`

---

### `raw.livescores`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_livescores_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_livescores_pkey`: `CREATE UNIQUE INDEX cricket_livescores_pkey ON raw.livescores USING btree (id)`
- `cricket_livescores_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_livescores_sportmonks_id_key ON raw.livescores USING btree (sportmonks_id)`

---

### `raw.officials`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_officials_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_officials_pkey`: `CREATE UNIQUE INDEX cricket_officials_pkey ON raw.officials USING btree (id)`
- `cricket_officials_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_officials_sportmonks_id_key ON raw.officials USING btree (sportmonks_id)`

---

### `raw.player_career`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.player_career_id_seq'::regclass) | PK |
| `player_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `player_career_pkey`: `CREATE UNIQUE INDEX player_career_pkey ON raw.player_career USING btree (id)`
- `player_career_player_id_key`: `CREATE UNIQUE INDEX player_career_player_id_key ON raw.player_career USING btree (player_id)`

---

### `raw.players`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources. Player master records.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_players_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_players_pkey`: `CREATE UNIQUE INDEX cricket_players_pkey ON raw.players USING btree (id)`
- `cricket_players_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_players_sportmonks_id_key ON raw.players USING btree (sportmonks_id)`
- `idx_raw_players_data`: `CREATE INDEX idx_raw_players_data ON raw.players USING gin (data)`

---

### `raw.positions`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_positions_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_positions_pkey`: `CREATE UNIQUE INDEX cricket_positions_pkey ON raw.positions USING btree (id)`
- `cricket_positions_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_positions_sportmonks_id_key ON raw.positions USING btree (sportmonks_id)`

---

### `raw.scores`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_scores_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_scores_pkey`: `CREATE UNIQUE INDEX cricket_scores_pkey ON raw.scores USING btree (id)`
- `cricket_scores_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_scores_sportmonks_id_key ON raw.scores USING btree (sportmonks_id)`

---

### `raw.seasons`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_seasons_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_seasons_pkey`: `CREATE UNIQUE INDEX cricket_seasons_pkey ON raw.seasons USING btree (id)`
- `cricket_seasons_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_seasons_sportmonks_id_key ON raw.seasons USING btree (sportmonks_id)`

---

### `raw.squads`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.squads_id_seq'::regclass) | PK |
| `team_id` | bigint | NO |  |  |
| `season_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `squads_pkey`: `CREATE UNIQUE INDEX squads_pkey ON raw.squads USING btree (id)`
- `squads_team_id_season_id_key`: `CREATE UNIQUE INDEX squads_team_id_season_id_key ON raw.squads USING btree (team_id, season_id)`

---

### `raw.stages`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_stages_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_stages_pkey`: `CREATE UNIQUE INDEX cricket_stages_pkey ON raw.stages USING btree (id)`
- `cricket_stages_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_stages_sportmonks_id_key ON raw.stages USING btree (sportmonks_id)`

---

### `raw.standings_season`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.standings_season_id_seq'::regclass) | PK |
| `season_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `standings_season_pkey`: `CREATE UNIQUE INDEX standings_season_pkey ON raw.standings_season USING btree (id)`
- `standings_season_season_id_key`: `CREATE UNIQUE INDEX standings_season_season_id_key ON raw.standings_season USING btree (season_id)`

---

### `raw.standings_stage`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.standings_stage_id_seq'::regclass) | PK |
| `stage_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `standings_stage_pkey`: `CREATE UNIQUE INDEX standings_stage_pkey ON raw.standings_stage USING btree (id)`
- `standings_stage_stage_id_key`: `CREATE UNIQUE INDEX standings_stage_stage_id_key ON raw.standings_stage USING btree (stage_id)`

---

### `raw.team_rankings`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_team_rankings_id_seq'::regclass) | PK |
| `ranking_type` | text | NO |  |  |
| `gender` | text | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_team_rankings_pkey`: `CREATE UNIQUE INDEX cricket_team_rankings_pkey ON raw.team_rankings USING btree (id)`
- `cricket_team_rankings_ranking_type_gender_key`: `CREATE UNIQUE INDEX cricket_team_rankings_ranking_type_gender_key ON raw.team_rankings USING btree (ranking_type, gender)`

---

### `raw.teams`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources. Team master records.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_teams_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_teams_pkey`: `CREATE UNIQUE INDEX cricket_teams_pkey ON raw.teams USING btree (id)`
- `cricket_teams_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_teams_sportmonks_id_key ON raw.teams USING btree (sportmonks_id)`
- `idx_raw_teams_data`: `CREATE INDEX idx_raw_teams_data ON raw.teams USING gin (data)`

---

### `raw.venues`

**Purpose:** Raw API ingest staging tables from SportMonks and other sources.

**Approx rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('raw.cricket_venues_id_seq'::regclass) | PK |
| `sportmonks_id` | bigint | NO |  |  |
| `data` | jsonb | NO |  |  |
| `api_updated_at` | timestamp with time zone | YES |  |  |
| `loaded_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `cricket_venues_pkey`: `CREATE UNIQUE INDEX cricket_venues_pkey ON raw.venues USING btree (id)`
- `cricket_venues_sportmonks_id_key`: `CREATE UNIQUE INDEX cricket_venues_sportmonks_id_key ON raw.venues USING btree (sportmonks_id)`

---

## Schema: `stats`

### `stats.fetch_run_details`

**Purpose:** Operational statistics about data fetch runs and table row counts.

**Approx rows:** 35,937

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('stats.fetch_run_details_id_seq'::regclass) | PK |
| `run_id` | bigint | NO |  | FK → `stats.fetch_runs.id` |
| `item_index` | integer | YES |  |  |
| `status` | text | NO |  |  |
| `category` | text | YES |  |  |
| `endpoint_name` | text | YES |  | PII |
| `endpoint_path` | text | YES |  |  |
| `full_url` | text | YES |  |  |
| `target_table` | text | YES |  |  |
| `records_fetched` | integer | YES |  |  |
| `rows_inserted` | integer | YES |  |  |
| `pages_fetched` | integer | YES |  |  |
| `paginated` | boolean | YES |  |  |
| `duration_ms` | numeric | YES |  |  |
| `http_status` | text | YES |  |  |
| `rate_limit_remaining` | text | YES |  |  |
| `rate_limit_limit` | text | YES |  |  |
| `started_at` | timestamp with time zone | YES |  |  |
| `finished_at` | timestamp with time zone | YES |  |  |
| `error_message` | text | YES |  |  |
| `error_detail` | jsonb | YES |  |  |
| `extra` | jsonb | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fetch_run_details_pkey`: `CREATE UNIQUE INDEX fetch_run_details_pkey ON stats.fetch_run_details USING btree (id)`
- `idx_stats_fetch_run_details_run_id`: `CREATE INDEX idx_stats_fetch_run_details_run_id ON stats.fetch_run_details USING btree (run_id)`
- `idx_stats_fetch_run_details_status`: `CREATE INDEX idx_stats_fetch_run_details_status ON stats.fetch_run_details USING btree (status)`

**Foreign keys:**

- `run_id` → `stats.fetch_runs.id` (ON UPDATE NO ACTION, ON DELETE CASCADE)

---

### `stats.fetch_runs`

**Purpose:** Operational statistics about data fetch runs and table row counts.

**Approx rows:** 4

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('stats.fetch_runs_id_seq'::regclass) | PK |
| `fetcher_name` | text | NO |  | PII |
| `run_started_at` | timestamp with time zone | NO |  |  |
| `run_finished_at` | timestamp with time zone | YES |  |  |
| `total_items` | integer | YES |  |  |
| `success_count` | integer | YES | 0 |  |
| `failed_count` | integer | YES | 0 |  |
| `log_file` | text | YES |  |  |
| `detail_file` | text | YES |  |  |
| `csv_file` | text | YES |  |  |
| `created_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `fetch_runs_pkey`: `CREATE UNIQUE INDEX fetch_runs_pkey ON stats.fetch_runs USING btree (id)`
- `idx_stats_fetch_runs_fetcher`: `CREATE INDEX idx_stats_fetch_runs_fetcher ON stats.fetch_runs USING btree (fetcher_name)`
- `idx_stats_fetch_runs_started`: `CREATE INDEX idx_stats_fetch_runs_started ON stats.fetch_runs USING btree (run_started_at)`

---

### `stats.layer_count_runs`

**Purpose:** Operational statistics about data fetch runs and table row counts.

**Approx rows:** 8

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('stats.layer_count_runs_id_seq'::regclass) | PK |
| `pipeline_name` | text | NO |  | PII |
| `source_run_id` | bigint | YES |  | FK → `stats.fetch_runs.id` |
| `etl_batch_id` | uuid | YES |  | FK → `etl.batch_run.id` |
| `run_started_at` | timestamp with time zone | NO | now() |  |
| `run_finished_at` | timestamp with time zone | NO | now() |  |
| `table_count` | integer | NO | 0 |  |
| `total_rows` | bigint | NO | 0 |  |
| `created_at` | timestamp with time zone | NO | now() |  |

**Indexes:**

- `idx_layer_count_runs_pipeline`: `CREATE INDEX idx_layer_count_runs_pipeline ON stats.layer_count_runs USING btree (pipeline_name)`
- `idx_layer_count_runs_started`: `CREATE INDEX idx_layer_count_runs_started ON stats.layer_count_runs USING btree (run_finished_at DESC)`
- `layer_count_runs_pkey`: `CREATE UNIQUE INDEX layer_count_runs_pkey ON stats.layer_count_runs USING btree (id)`

**Foreign keys:**

- `etl_batch_id` → `etl.batch_run.id` (ON UPDATE NO ACTION, ON DELETE SET NULL)
- `source_run_id` → `stats.fetch_runs.id` (ON UPDATE NO ACTION, ON DELETE SET NULL)

---

### `stats.table_row_counts`

**Purpose:** Operational statistics about data fetch runs and table row counts.

**Approx rows:** 799

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | bigint | NO | nextval('stats.table_row_counts_id_seq'::regclass) | PK |
| `count_run_id` | bigint | NO |  | FK → `stats.layer_count_runs.id` |
| `schema_name` | text | NO |  | PII |
| `table_name` | text | NO |  | PII |
| `row_count` | bigint | NO |  |  |

**Indexes:**

- `idx_table_row_counts_run`: `CREATE INDEX idx_table_row_counts_run ON stats.table_row_counts USING btree (count_run_id)`
- `idx_table_row_counts_schema_table`: `CREATE INDEX idx_table_row_counts_schema_table ON stats.table_row_counts USING btree (schema_name, table_name)`
- `table_row_counts_pkey`: `CREATE UNIQUE INDEX table_row_counts_pkey ON stats.table_row_counts USING btree (id)`
- `uq_table_row_counts_run`: `CREATE UNIQUE INDEX uq_table_row_counts_run ON stats.table_row_counts USING btree (count_run_id, schema_name, table_name)`

**Foreign keys:**

- `count_run_id` → `stats.layer_count_runs.id` (ON UPDATE NO ACTION, ON DELETE CASCADE)

---

### Views in `stats`

- `latest_table_row_counts` — Operational statistics about data fetch runs and table row counts.

---

