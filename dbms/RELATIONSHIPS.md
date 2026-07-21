# Database Relationships

> 82 foreign key relationships across 7 schemas.

## Summary by schema

| Source schema | Outgoing FKs |
|---------------|-------------:|
| `etl` | 1 |
| `gold` | 0 |
| `master` | 25 |
| `matches` | 49 |
| `public` | 3 |
| `raw` | 0 |
| `stats` | 4 |

## Relationship catalog

| Source | Column | Target | On update | On delete |
|--------|--------|--------|-----------|-----------|
| `etl.watermark` | `last_batch_id` | `etl.batch_run.id` | NO ACTION | SET NULL |
| `master.countries` | `continent_id` | `master.continents.sportmonks_id` | NO ACTION | NO ACTION |
| `master.leagues` | `active_season_id` | `master.seasons.sportmonks_id` | CASCADE | SET NULL |
| `master.leagues` | `country_id` | `master.countries.sportmonks_id` | NO ACTION | NO ACTION |
| `master.legends` | `league_id` | `master.leagues.sportmonks_id` | NO ACTION | NO ACTION |
| `master.legends` | `season_id` | `master.seasons.sportmonks_id` | NO ACTION | NO ACTION |
| `master.legends` | `stage_id` | `master.stages.sportmonks_id` | NO ACTION | NO ACTION |
| `master.officials` | `country_id` | `master.countries.sportmonks_id` | NO ACTION | NO ACTION |
| `master.player_career_stats` | `player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `master.player_career_stats` | `season_id` | `master.seasons.sportmonks_id` | NO ACTION | NO ACTION |
| `master.players` | `country_id` | `master.countries.sportmonks_id` | NO ACTION | NO ACTION |
| `master.players` | `position_id` | `master.positions.sportmonks_id` | NO ACTION | NO ACTION |
| `master.seasons` | `league_id` | `master.leagues.sportmonks_id` | NO ACTION | NO ACTION |
| `master.stages` | `league_id` | `master.leagues.sportmonks_id` | NO ACTION | NO ACTION |
| `master.stages` | `season_id` | `master.seasons.sportmonks_id` | NO ACTION | NO ACTION |
| `master.standings` | `league_id` | `master.leagues.sportmonks_id` | NO ACTION | NO ACTION |
| `master.standings` | `legend_id` | `master.legends.sportmonks_id` | NO ACTION | NO ACTION |
| `master.standings` | `season_id` | `master.seasons.sportmonks_id` | NO ACTION | NO ACTION |
| `master.standings` | `stage_id` | `master.stages.sportmonks_id` | NO ACTION | NO ACTION |
| `master.standings` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `master.team_rankings` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `master.team_squad_members` | `player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `master.team_squad_members` | `season_id` | `master.seasons.sportmonks_id` | NO ACTION | NO ACTION |
| `master.team_squad_members` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `master.teams` | `country_id` | `master.countries.sportmonks_id` | NO ACTION | NO ACTION |
| `master.venues` | `country_id` | `master.countries.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `batsman_non_striker_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `batsman_out_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `batsman_scorer_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `batsman_striker_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `bowler_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `catch_stump_player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `runout_by_player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `score_outcome_id` | `master.score_outcomes.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_balls` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `batsman_out_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `bowling_player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `catch_stump_player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `runout_by_player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `score_outcome_id` | `master.score_outcomes.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_batting` | `wicket_outcome_id` | `master.score_outcomes.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_bowling` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_bowling` | `player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_bowling` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_inning_overs` | `bowler_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_inning_overs` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_inning_overs` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_lineups` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_lineups` | `player_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_lineups` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_odds` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_runs` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_runs` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_scoreboards` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_scoreboards` | `team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixture_weather` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `first_umpire_id` | `master.officials.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `league_id` | `master.leagues.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `localteam_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `man_of_match_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `man_of_series_id` | `master.players.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `referee_id` | `master.officials.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `season_id` | `master.seasons.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `second_umpire_id` | `master.officials.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `stage_id` | `master.stages.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `toss_won_team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `tv_umpire_id` | `master.officials.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `venue_id` | `master.venues.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `visitorteam_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.fixtures` | `winner_team_id` | `master.teams.sportmonks_id` | NO ACTION | NO ACTION |
| `matches.livescore_snapshots` | `fixture_id` | `matches.fixtures.sportmonks_id` | NO ACTION | NO ACTION |
| `public.cricket_matches` | `away_team_id` | `public.teams.id` | NO ACTION | NO ACTION |
| `public.cricket_matches` | `home_team_id` | `public.teams.id` | NO ACTION | NO ACTION |
| `public.cricket_matches` | `winner_team_id` | `public.teams.id` | NO ACTION | NO ACTION |
| `stats.fetch_run_details` | `run_id` | `stats.fetch_runs.id` | NO ACTION | CASCADE |
| `stats.layer_count_runs` | `etl_batch_id` | `etl.batch_run.id` | NO ACTION | SET NULL |
| `stats.layer_count_runs` | `source_run_id` | `stats.fetch_runs.id` | NO ACTION | SET NULL |
| `stats.table_row_counts` | `count_run_id` | `stats.layer_count_runs.id` | NO ACTION | CASCADE |

## Inferred cardinalities

| Pattern | Examples |
|---------|----------|
| 1:N | `master.teams` → `matches.fixtures` (via team FK columns) |
| 1:N | `matches.fixtures` → `matches.fixture_balls` |
| 1:N | `master.players` → `master.player_career_stats` |
| N:M (via bridge) | `master.team_squad_members` links teams and players |
| Self-reference | Check FK targets where source and target table match |

## Domain clusters

- **Application**
- **Competition structure**
- **ETL control**
- **Ingestion (raw layer)**
- **Master data**
- **Match facts**
- **Participants**
- **Pipeline observability**
- **Reference data**
