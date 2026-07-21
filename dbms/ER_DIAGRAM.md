# Cricket AI — Entity Relationship Diagrams

> Generated 2026-07-15 11:10:25.657404+00. Diagrams split by schema for readability.

## Architecture overview

```mermaid
flowchart LR
  raw["raw"]
  master["master"]
  matches["matches"]
  gold["gold"]
  etl["etl"]
  stats["stats"]
  public["public"]
  raw --> master
  master --> matches
  master --> gold
  matches --> gold
  etl --> master
  etl --> matches
```

## master

```mermaid
erDiagram
  continents {
    int8 id
    uuid uuid
    int8 sportmonks_id
    text name
    timestamptz api_updated_at
    bool is_active
    timestamptz created_at
    timestamptz updated_at
  }
  countries {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 continent_id
    text name
    text image_path
    timestamptz api_updated_at
    bool is_active
    text _2_more_columns
  }
  leagues {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 active_season_id
    int8 country_id
    text name
    text code
    text image_path
    text _5_more_columns
  }
  legends {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 stage_id
    int8 season_id
    int8 league_id
    int4 position
    text description
    text _3_more_columns
  }
  officials {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 country_id
    text firstname
    text lastname
    text fullname
    date dateofbirth
    text _5_more_columns
  }
  player_career_stats {
    int8 id
    uuid uuid
    int8 player_id
    int8 season_id
    text format_type
    int4 batting_matches
    int4 batting_innings
    int4 batting_runs
    text _29_more_columns
  }
  players {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 country_id
    int8 position_id
    text firstname
    text lastname
    text fullname
    text _9_more_columns
  }
  positions {
    int8 id
    uuid uuid
    int8 sportmonks_id
    text name
    timestamptz created_at
    timestamptz updated_at
  }
  score_outcomes {
    int8 id
    uuid uuid
    int8 sportmonks_id
    text name
    int4 runs
    bool is_four
    bool is_six
    int4 bye
    text _9_more_columns
  }
  scoreboard_innings {
    text code
    int2 inning_number
    text description
  }
  seasons {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 league_id
    text name
    text code
    timestamptz api_updated_at
    bool is_active
    text _2_more_columns
  }
  stages {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 league_id
    int8 season_id
    text name
    text code
    text stage_type
    text _4_more_columns
  }
  standings {
    int8 id
    uuid uuid
    int8 team_id
    int8 stage_id
    int8 season_id
    int8 league_id
    int8 legend_id
    int4 position
    text _15_more_columns
  }
  team_rankings {
    int8 id
    uuid uuid
    text format_type
    text gender
    int8 team_id
    int4 position
    numeric points
    numeric rating
    text _3_more_columns
  }
  team_squad_members {
    int8 id
    uuid uuid
    int8 team_id
    int8 player_id
    int8 season_id
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  teams {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 country_id
    text name
    text code
    text image_path
    bool national_team
    text _4_more_columns
  }
  venues {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 country_id
    text name
    text city
    text image_path
    int4 capacity
    text _5_more_columns
  }
  continents ||--o{ countries : "continent_id"
  seasons ||--o{ leagues : "active_season_id"
  countries ||--o{ leagues : "country_id"
  leagues ||--o{ legends : "league_id"
  seasons ||--o{ legends : "season_id"
  stages ||--o{ legends : "stage_id"
  countries ||--o{ officials : "country_id"
  players ||--o{ player_career_stats : "player_id"
  seasons ||--o{ player_career_stats : "season_id"
  countries ||--o{ players : "country_id"
  positions ||--o{ players : "position_id"
  leagues ||--o{ seasons : "league_id"
  leagues ||--o{ stages : "league_id"
  seasons ||--o{ stages : "season_id"
  leagues ||--o{ standings : "league_id"
  legends ||--o{ standings : "legend_id"
  seasons ||--o{ standings : "season_id"
  stages ||--o{ standings : "stage_id"
  teams ||--o{ standings : "team_id"
  teams ||--o{ team_rankings : "team_id"
  players ||--o{ team_squad_members : "player_id"
  seasons ||--o{ team_squad_members : "season_id"
  teams ||--o{ team_squad_members : "team_id"
  countries ||--o{ teams : "country_id"
  countries ||--o{ venues : "country_id"
```

## matches

> Aligns with data team diagram `cricket_ai_dev - cricket_ai_dev - matches.png`. See `DATA_TEAM_ALIGNMENT.md` for alias mapping.

```mermaid
erDiagram
  fixture_balls {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    numeric ball_number
    text scoreboard
    int8 batsman_striker_id
    int8 batsman_non_striker_id
    int8 batsman_scorer_id
    int8 bowler_id
    int8 batsman_out_id
    text _6_more_columns
  }
  fixture_batting {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    int8 player_id
    int4 sort_order
    bool is_active
    text scoreboard
    int4 runs_scored
    int4 balls_faced
    int4 fours
    text _13_more_columns
  }
  fixture_bowling {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    int8 player_id
    int4 sort_order
    bool is_active
    text scoreboard
    numeric overs
    int4 maidens
    int4 runs_conceded
    text _7_more_columns
  }
  fixture_inning_overs {
    int8 id
    uuid uuid
    int8 fixture_id
    int8 team_id
    text scoreboard
    int4 over_number
    int4 runs_in_over
    int4 wickets_in_over
    int8 bowler_id
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_lineups {
    int8 id
    uuid uuid
    int8 fixture_id
    int8 team_id
    int8 player_id
    bool is_captain
    bool is_wicketkeeper
    bool is_substitute
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_odds {
    int8 id
    uuid uuid
    int8 fixture_id
    jsonb odds_json
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_runs {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    int2 inning
    int4 score
    int4 wickets
    numeric overs
    text powerplay_1
    text powerplay_2
    text powerplay_3
    text _3_more_columns
  }
  fixture_scoreboards {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    text scoreboard
    text board_type
    int4 wides
    int4 noball_runs
    int4 noball_balls
    int4 byes
    int4 leg_byes
    text _7_more_columns
  }
  fixture_weather {
    int8 id
    uuid uuid
    int8 fixture_id
    int2 report_sequence
    jsonb weather_json
    timestamptz api_updated_at
    timestamptz created_at
  }
  fixtures {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 league_id
    int8 season_id
    int8 stage_id
    text round
    int8 localteam_id
    int8 visitorteam_id
    timestamptz starting_at
    text match_format
    bool is_live
    text status
    text last_period
    text note
    int8 venue_id
    int8 toss_won_team_id
    int8 winner_team_id
    text draw_noresult
    int8 first_umpire_id
    int8 second_umpire_id
    int8 tv_umpire_id
    int8 referee_id
    int8 man_of_match_id
    int8 man_of_series_id
    int4 total_overs_played
    text elected
    bool super_over
    bool follow_on
    int4 localteam_dl_score
    numeric localteam_dl_overs
    int4 localteam_dl_wickets
    int4 visitorteam_dl_score
    numeric visitorteam_dl_overs
    int4 visitorteam_dl_wickets
    int4 visitorteam_dl_total_overs
    numeric rpc_overs
    int4 rpc_target
    timestamptz api_updated_at
    bool is_published
    bool is_active
    timestamptz created_at
    timestamptz updated_at
  }
  livescore_snapshots {
    int8 id
    uuid uuid
    int8 fixture_id
    timestamptz snapshot_at
    text status
    bool is_live
    text payload_hash
    timestamptz created_at
  }
  fixtures ||--o{ fixture_balls : "fixture_id"
  fixtures ||--o{ fixture_batting : "fixture_id"
  fixtures ||--o{ fixture_bowling : "fixture_id"
  fixtures ||--o{ fixture_inning_overs : "fixture_id"
  fixtures ||--o{ fixture_lineups : "fixture_id"
  fixtures ||--o{ fixture_odds : "fixture_id"
  fixtures ||--o{ fixture_runs : "fixture_id"
  fixtures ||--o{ fixture_scoreboards : "fixture_id"
  fixtures ||--o{ fixture_weather : "fixture_id"
  fixtures ||--o{ livescore_snapshots : "fixture_id"
```

## raw

```mermaid
erDiagram
  api_ingest {
    int8 id
    text source_file
    jsonb payload
    timestamptz ingested_at
    text checksum
  }
  continents {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  countries {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  cricket_all_matches {
    text info
    text innings
    text meta
  }
  fixture_includes {
    int8 id
    int8 fixture_id
    text include_param
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  fixtures {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  id_fixture_includes {
    int8 id
    int8 fixture_id
    text include_param
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  id_player_career {
    int8 id
    int8 player_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  id_squads {
    int8 id
    int8 team_id
    int8 season_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  id_standings_season {
    int8 id
    int8 season_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  id_standings_stage {
    int8 id
    int8 stage_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  ipl_matches {
    jsonb info
    jsonb innings
    jsonb meta
  }
  leagues {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  livescores {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  officials {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  player_career {
    int8 id
    int8 player_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  players {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  positions {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  scores {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  seasons {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  squads {
    int8 id
    int8 team_id
    int8 season_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  stages {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  standings_season {
    int8 id
    int8 season_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  standings_stage {
    int8 id
    int8 stage_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  team_rankings {
    int8 id
    text ranking_type
    text gender
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  teams {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
  venues {
    int8 id
    int8 sportmonks_id
    jsonb data
    timestamptz api_updated_at
    timestamptz loaded_at
  }
```

## public

```mermaid
erDiagram
  cricket_matches {
    int4 id
    int4 home_team_id
    int4 away_team_id
    timestamptz match_date
    varchar venue
    varchar status
    int4 winner_team_id
    timestamptz created_at
  }
  flyway_schema_history {
    int4 installed_rank
    varchar version
    varchar description
    varchar type
    varchar script
    int4 checksum
    varchar installed_by
    timestamp installed_on
    text _2_more_columns
  }
  teams {
    int4 id
    varchar name
    varchar code
    timestamptz created_at
  }
  waitlist {
    int4 id
    varchar email
    timestamptz created_at
  }
  teams ||--o{ cricket_matches : "away_team_id"
  teams ||--o{ cricket_matches : "home_team_id"
  teams ||--o{ cricket_matches : "winner_team_id"
```

## etl

```mermaid
erDiagram
  batch_run {
    uuid id
    text pipeline_name
    text layer
    timestamptz started_at
    timestamptz finished_at
    text status
    int8 records_read
    int8 records_written
    text _1_more_columns
  }
  watermark {
    int8 id
    text entity_name
    timestamptz last_loaded_at
    timestamptz last_run_at
    uuid last_batch_id
    int8 rows_written
  }
  batch_run ||--o{ watermark : "last_batch_id"
```

## stats

```mermaid
erDiagram
  fetch_run_details {
    int8 id
    int8 run_id
    int4 item_index
    text status
    text category
    text endpoint_name
    text endpoint_path
    text full_url
    text _15_more_columns
  }
  fetch_runs {
    int8 id
    text fetcher_name
    timestamptz run_started_at
    timestamptz run_finished_at
    int4 total_items
    int4 success_count
    int4 failed_count
    text log_file
    text _3_more_columns
  }
  layer_count_runs {
    int8 id
    text pipeline_name
    int8 source_run_id
    uuid etl_batch_id
    timestamptz run_started_at
    timestamptz run_finished_at
    int4 table_count
    int8 total_rows
    text _1_more_columns
  }
  table_row_counts {
    int8 id
    int8 count_run_id
    text schema_name
    text table_name
    int8 row_count
  }
  fetch_runs ||--o{ fetch_run_details : "run_id"
  fetch_runs ||--o{ layer_count_runs : "source_run_id"
  layer_count_runs ||--o{ table_row_counts : "count_run_id"
```

## matches (full columns)

For every column on `fixtures` and all child tables, open `ER_DIAGRAM_MATCHES_FULL.mmd` or the data team PNG.

```mermaid
%% matches schema — full columns (live DB)
%% Data team diagram: cricket_ai_dev - cricket_ai_dev - matches.png
%% Aliases: fixture_inning_overs = fixture_innings_runs, livescore_snapshots = fixture_snapshots
%% Planned (not in DB): fixtures_analysis
erDiagram
  fixture_balls {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    numeric ball_number
    text scoreboard
    int8 batsman_striker_id
    int8 batsman_non_striker_id
    int8 batsman_scorer_id
    int8 bowler_id
    int8 batsman_out_id
    int8 catch_stump_player_id
    int8 runout_by_player_id
    int8 score_outcome_id
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_batting {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    int8 player_id
    int4 sort_order
    bool is_active
    text scoreboard
    int4 runs_scored
    int4 balls_faced
    int4 fours
    int4 sixes
    numeric strike_rate
    int8 wicket_outcome_id
    int8 score_outcome_id
    int8 catch_stump_player_id
    int8 runout_by_player_id
    int8 batsman_out_id
    int8 bowling_player_id
    int4 fow_score
    numeric fow_balls
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_bowling {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    int8 player_id
    int4 sort_order
    bool is_active
    text scoreboard
    numeric overs
    int4 maidens
    int4 runs_conceded
    int4 wickets
    int4 wides
    int4 noballs
    numeric economy_rate
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_inning_overs {
    int8 id
    uuid uuid
    int8 fixture_id
    int8 team_id
    text scoreboard
    int4 over_number
    int4 runs_in_over
    int4 wickets_in_over
    int8 bowler_id
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_lineups {
    int8 id
    uuid uuid
    int8 fixture_id
    int8 team_id
    int8 player_id
    bool is_captain
    bool is_wicketkeeper
    bool is_substitute
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_odds {
    int8 id
    uuid uuid
    int8 fixture_id
    jsonb odds_json
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_runs {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    int2 inning
    int4 score
    int4 wickets
    numeric overs
    text powerplay_1
    text powerplay_2
    text powerplay_3
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_scoreboards {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 fixture_id
    int8 team_id
    text scoreboard
    text board_type
    int4 wides
    int4 noball_runs
    int4 noball_balls
    int4 byes
    int4 leg_byes
    int4 penalty
    int4 total_runs
    numeric overs
    int4 wickets
    timestamptz api_updated_at
    timestamptz created_at
    timestamptz updated_at
  }
  fixture_weather {
    int8 id
    uuid uuid
    int8 fixture_id
    int2 report_sequence
    jsonb weather_json
    timestamptz api_updated_at
    timestamptz created_at
  }
  fixtures {
    int8 id
    uuid uuid
    int8 sportmonks_id
    int8 league_id
    int8 season_id
    int8 stage_id
    text round
    int8 localteam_id
    int8 visitorteam_id
    timestamptz starting_at
    text match_format
    bool is_live
    text status
    text last_period
    text note
    int8 venue_id
    int8 toss_won_team_id
    int8 winner_team_id
    text draw_noresult
    int8 first_umpire_id
    int8 second_umpire_id
    int8 tv_umpire_id
    int8 referee_id
    int8 man_of_match_id
    int8 man_of_series_id
    int4 total_overs_played
    text elected
    bool super_over
    bool follow_on
    int4 localteam_dl_score
    numeric localteam_dl_overs
    int4 localteam_dl_wickets
    int4 visitorteam_dl_score
    numeric visitorteam_dl_overs
    int4 visitorteam_dl_wickets
    int4 visitorteam_dl_total_overs
    numeric rpc_overs
    int4 rpc_target
    timestamptz api_updated_at
    bool is_published
    bool is_active
    timestamptz created_at
    timestamptz updated_at
  }
  livescore_snapshots {
    int8 id
    uuid uuid
    int8 fixture_id
    timestamptz snapshot_at
    text status
    bool is_live
    text payload_hash
    timestamptz created_at
  }
  fixtures ||--o{ fixture_balls : "fixture_id"
  fixtures ||--o{ fixture_batting : "fixture_id"
  fixtures ||--o{ fixture_bowling : "fixture_id"
  fixtures ||--o{ fixture_inning_overs : "fixture_id"
  fixtures ||--o{ fixture_lineups : "fixture_id"
  fixtures ||--o{ fixture_odds : "fixture_id"
  fixtures ||--o{ fixture_runs : "fixture_id"
  fixtures ||--o{ fixture_scoreboards : "fixture_id"
  fixtures ||--o{ fixture_weather : "fixture_id"
  fixtures ||--o{ livescore_snapshots : "fixture_id"
```


## Gold layer views

The `gold` schema contains 21 analytical views (dim_*, fact_*, v_fixture_summary) built over master and matches. See `SCHEMA.md` for the view list.
