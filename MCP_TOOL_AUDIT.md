# Cricket MCP Tool Audit and Architecture

Date: 2026-07-21

## Executive recommendation

Keep the seven existing tools, add the nine tools below, and enhance four existing tools in place. This produces a 16-tool manifest, below the limit of 20, while covering the user-facing `master`, `matches`, `gold`, and `insights` data layers.

The highest-value work is:

1. Enrich `get_match_data`, `get_fixtures`, `get_league_data`, and `get_player_stats` so their existing intents return names and accept natural-language filters.
2. Add `get_match_context`, `get_player_match_history`, `get_ball_analysis`, and `get_team_analytics`.
3. Add `get_trends`, `search_cricket_entities`, `get_venue_stats`, `get_rankings`, and `get_live_match_state`.

The design deliberately keeps raw ball retrieval out of the default path. `get_ball_analysis` returns bounded analytical aggregates and only returns individual deliveries when the caller explicitly asks for a small, paginated sample.

## Audit notes from the current code

- The seven registered MCP tools are in `libs/mcp-server/src/tools/` and are dispatched through `execute-cricket-tool.ts`.
- Database access already follows the required `pg.Pool` pattern through `libs/database/src/client.ts` and `libs/database/src/queries/`.
- The current query layer uses direct `master` and `matches` joins. It does not currently use the `gold` views, including `gold.v_fixture_summary`.
- The supplied catalog says `get_fixtures` returns IDs only. The current source does join `master.teams` and returns local/visitor team names, but it still omits league, season, stage, venue, winner, officials, and score names. It should use a human-readable fixture projection, preferably `gold.v_fixture_summary`, with a stable fallback when a view column is unavailable.
- `get_match_data` currently returns fixture metadata, batting, bowling, and innings totals. It does not return lineup, venue, officials, weather, odds, extras, over progression, or live snapshots.
- `compare_entities` uses ball-by-ball only for batsman-vs-bowler matchup aggregates; it does not expose phase, over, powerplay, death, dismissal, or raw-delivery analysis.
- `get_player_stats` exposes career/season aggregates, not match history. It also has no position, batting-style, or bowling-style filters.
- `get_league_data` exposes standings, career-stat leaderboards, fixtures, and a season overview, but not stage-scoped views, legends, rankings, or time series.
- `master.team_rankings` and `gold.fact_team_ranking` are not currently exposed. The gold view is empty, so ranking queries must read `master.team_rankings` directly.
- Placeholder players such as `Unknown player {id}` must be excluded from all new human-facing queries and from entity-resolution results.
- `insights.pre_computed_insights` is a cache of generated content. `get_insight` should remain a cache read; dynamic insight generation belongs to the AI agent, not a new database tool.

## Data exposure policy

The proposed tools cover `master`, `matches`, `gold`, and `insights`. The `raw`, `etl`, `stats`, and application-only `public` schemas remain intentionally unavailable to the LLM. They are ingestion, monitoring, or application-internal layers, not a user-facing cricket API.

Every response should include a small `scope` object with resolved entity names, filters, row counts, and `dataFreshness` where available. IDs may be included for traceability, but names must be present for every entity the model is expected to discuss.

## Existing tools: keep and enhance

### `get_player_stats` — enhance, do not duplicate

Add `league_name`, `season_year`, `position`, `batting_style`, `bowling_style`, and a bounded `limit`. Resolve names through `master.players`, `master.leagues`, and `master.seasons`; filter placeholders; return `profile`, `careerStats`, and resolved filters with names. Keep match history in the new `get_player_match_history` tool.

### `get_team_data` — enhance, do not duplicate

Keep `profile`, `squad`, `form`, and `season_stats`. Add optional `team_name` resolution and return league/season/stage names. Do not add venue splits or opponent analytics here; those belong in `get_team_analytics`.

### `get_match_data` — enhance scorecard behavior

Keep this as the scorecard tool. Add human-readable venue, league, season, stage, winner, toss, and official names to the fixture payload. Add optional `team_name` lookup. Do not turn it into an unbounded god-tool; contextual sections belong in `get_match_context`.

### `get_fixtures` — enhance discovery behavior

Use `gold.v_fixture_summary` as the primary source. Support `league_name`, `season_year`, `stage_id`/`stage_name`, `venue_id`/`venue_name`, `team_name`, `winner_team_id`, `match_format`, and date range. Return a compact named fixture row with pagination and `hasMore`. The existing direct `master.teams` query is a useful fallback, not the preferred source.

### `get_league_data` — add stage and named filters

Add `league_name`, `season_year`, `stage_id`, `stage_type`, and `limit`. Add `stage_overview` to the existing `data_type` enum, backed by standings, fixtures, `master.stages`, and `master.legends`. Keep standings, leaderboard, fixtures, and season overview in this tool because they are one competition-information category.

### `compare_entities` — extend the comparison dimensions

Add `season_ids`, `venue_id`, `date_from`, `date_to`, `phase`, and `format_types` (bounded to a small list). Keep entity-vs-entity comparisons here. Do not use it as a substitute for generic phase analytics or player match history.

### `get_insight` — keep as a cache read

Add optional `allow_stale` and return cache age/status. Do not add a second dynamic insight tool. The AI agent may synthesize a fresh narrative from the new analytical tools.

## New tool 1: `search_cricket_entities`

PRIORITY: HIGH

DESCRIPTION: Resolve or search cricket entities by natural-language name and return compact, human-readable records for follow-up tool calls.

USER QUESTIONS THIS ANSWERS:

- “Which league is the IPL and what seasons are available?”
- “Find venues in Mumbai.”
- “Who was the umpire in the 2024 final?”

INPUT SCHEMA:

```ts
{
  entity_type: 'player' | 'team' | 'league' | 'season' | 'stage' |
    'venue' | 'official' | 'country' | 'position' | 'continent', // required
  query?: string,                 // optional name/code/city search
  entity_id?: number,             // optional SportMonks ID lookup
  league_id?: number,             // optional season/stage scope
  season_id?: number,             // optional stage scope
  limit?: number                  // optional, 1..25; default 10
}
```

DATABASE SOURCES:

Primary: `gold.dim_player`, `gold.dim_team`, `gold.dim_league`, `gold.dim_season`, `gold.dim_stage`, `gold.dim_venue`, `gold.dim_official`, `gold.dim_country`, `gold.dim_position`, `gold.dim_continent`

Joins: `master.leagues`, `master.seasons`, `master.stages`, and `master.players` only where a dimension lacks the requested filter.

RETURN SHAPE:

```ts
{
  component: 'EntitySearchResults',
  data: {
    entityType: 'venue',
    results: [{ id, name, code?, city?, leagueName?, seasonName?, ... }],
    count: number,
    hasMore: boolean
  }
}
```

WHY THIS IS NEEDED: Existing tools resolve players or teams only as an implementation detail and require numeric IDs for leagues, seasons, stages, venues, and officials. A single lookup tool prevents avoidable ID-chaining and supports direct reference-data questions.

SMART ROUTER INTENTS: `entity_lookup`, `league_lookup`, `season_lookup`, `venue_lookup`, `official_lookup`, `team_lookup`, `player_lookup`

## New tool 2: `get_player_match_history`

PRIORITY: HIGH

DESCRIPTION: Return a player's match-level batting and/or bowling performances with named opponents, competitions, dates, and venues.

USER QUESTIONS THIS ANSWERS:

- “Show Kohli's last ten IPL innings.”
- “How did Bumrah bowl match by match in the 2024 season?”
- “List a player's scores against Australia at home.”

INPUT SCHEMA:

```ts
{
  player_id?: number,
  player_name?: string,            // one of player_id/player_name required
  data_type: 'batting' | 'bowling' | 'combined', // required
  league_id?: number,
  season_id?: number,
  season_year?: string,
  format_type?: string,
  opponent_team_id?: number,
  venue_id?: number,
  date_from?: string,
  date_to?: string,
  limit?: number,                  // 1..100; default 20
  offset?: number
}
```

DATABASE SOURCES:

Primary: `gold.fact_batting`, `gold.fact_bowling`

Joins: `gold.fact_fixture`, `gold.dim_player`, `gold.dim_team`, `gold.dim_league`, `gold.dim_season`, `gold.dim_venue`, `gold.dim_date`.

RETURN SHAPE:

```ts
{
  component: 'PlayerMatchHistory',
  data: {
    player: { id, name },
    batting?: [{ fixtureId, date, competition, opponent, venue, runs, balls, fours, sixes, strikeRate, dismissal }],
    bowling?: [{ fixtureId, date, competition, opponent, venue, overs, maidens, runsConceded, wickets, economy }],
    scope: { ...resolvedFilters },
    hasMore: boolean
  }
}
```

WHY THIS IS NEEDED: `get_player_stats` exposes `master.player_career_stats`, which cannot answer match-by-match, opponent, venue, or date questions. This tool exposes `fact_batting` and `fact_bowling` without duplicating career aggregates.

SMART ROUTER INTENTS: `player_match_history`, `player_innings`, `player_match_log`, `player_opponent_record`

## New tool 3: `get_match_context`

PRIORITY: HIGH

DESCRIPTION: Return bounded non-scorecard context for a fixture: lineup, venue, officials, extras, over progression, weather, odds metadata, and live snapshots.

USER QUESTIONS THIS ANSWERS:

- “Who played in the final and who were the umpires?”
- “How many wides and no-balls were there?”
- “What was the weather and over-by-over scoring?”

INPUT SCHEMA:

```ts
{
  fixture_id: number, // required
  sections?: Array<'summary' | 'lineup' | 'venue' | 'officials' | 'extras' |
    'overs' | 'weather' | 'odds' | 'live_state'>, // default: all safe sections
  scoreboard?: string,
  include_delivery_sample?: boolean,
  delivery_limit?: number // max 100 when explicitly requested
}
```

DATABASE SOURCES:

Primary: `gold.v_fixture_summary`, `gold.fact_fixture`, `gold.fact_lineup`, `gold.fact_fixture_run`, `gold.fact_ball`

Joins: `gold.dim_venue`, `gold.dim_official`, `gold.dim_team`, `gold.dim_player`, `matches.fixture_scoreboards`, `matches.fixture_inning_overs`, `matches.fixture_weather`, `matches.fixture_odds`, `matches.livescore_snapshots`, and `master.score_outcomes`.

RETURN SHAPE:

```ts
{
  component: 'MatchContext',
  data: {
    match: { fixtureId, teams, competition, season, stage, date, status },
    lineup?: [{ team, player, isCaptain, isWicketkeeper, isSubstitute }],
    venue?: { id, name, city, capacity, floodlight },
    officials?: [{ role, id, name, country }],
    extras?: { wides, noBalls, byes, legByes, penalty, total },
    overs?: [{ inning, overNumber, runs, wickets, bowler }],
    weather?: { ...normalizedWeatherFields, raw?: object },
    odds?: { ...normalizedMarketFields, raw?: object },
    liveState?: { snapshotAt, status, isLive, ... }
  }
}
```

WHY THIS IS NEEDED: `get_match_data` is intentionally a scorecard tool and currently omits all of this context. This one fixture-scoped tool makes a match answer possible in one additional call rather than a chain of unrelated table lookups. Odds must be access-controlled and returned as factual market data only; the agent must not provide betting advice.

SMART ROUTER INTENTS: `match_context`, `playing_xi`, `match_officials`, `match_venue`, `match_extras`, `over_progression`, `match_weather`, `match_odds`

## New tool 4: `get_ball_analysis`

PRIORITY: HIGH

DESCRIPTION: Aggregate ball-by-ball data by over, phase, batter, bowler, dismissal, or innings without returning the full million-row fact table.

USER QUESTIONS THIS ANSWERS:

- “How did a team score in the powerplay and death overs?”
- “What is Bumrah's death-over economy and wicket count?”
- “Which bowling styles dismiss this batter most often?”

INPUT SCHEMA:

```ts
{
  fixture_id?: number,
  team_id?: number,
  player_id?: number,
  league_id?: number,
  season_id?: number,
  format_type?: string,
  analysis_type: 'over' | 'phase' | 'batter' | 'bowler' |
    'dismissal' | 'partnership', // required
  scoreboard?: string,
  phase?: 'powerplay' | 'middle' | 'death',
  from_over?: number,
  to_over?: number,
  limit?: number // max 100 summary rows; no unbounded raw mode
}
```

DATABASE SOURCES:

Primary: `gold.fact_ball`

Joins: `master.score_outcomes`, `gold.dim_player`, `gold.dim_team`, `gold.fact_fixture`, `gold.dim_league`, `gold.dim_season`, `gold.dim_date`. Use `matches.fixture_inning_overs` for an over-level shortcut when the question is strictly run/wicket progression.

RETURN SHAPE:

```ts
{
  component: 'BallAnalysis',
  data: {
    scope: { fixtureIds, teams, competition, phase, format },
    summaries: [{ label, balls, runs, wickets, fours, sixes, economy?, strikeRate? }],
    byDismissalType?: [{ label, count, percentage }],
    byBowlingStyle?: [{ label, count, percentage }],
    coverage: { rowsScanned, rowsReturned, isSampled }
  }
}
```

WHY THIS IS NEEDED: `compare_entities` only computes one batsman-vs-bowler matchup. It cannot answer phase, over, dismissal, powerplay, death, or team-level ball questions. The aggregate boundary protects the LLM context window and database.

SMART ROUTER INTENTS: `ball_analysis`, `phase_analysis`, `powerplay_analysis`, `death_overs`, `dismissal_analysis`, `over_analysis`

## New tool 5: `get_team_analytics`

PRIORITY: HIGH

DESCRIPTION: Analyze a team's performance by venue, opponent, competition, season, format, or match phase.

USER QUESTIONS THIS ANSWERS:

- “How does India perform at Wankhede compared with away games?”
- “What is the head-to-head record between these teams in Tests?”
- “Show a team's win rate and scoring trend by season.”

INPUT SCHEMA:

```ts
{
  team_id?: number,
  team_name?: string, // one required
  data_type: 'venue_split' | 'opponent_split' | 'head_to_head' | 'performance', // required
  opponent_team_id?: number,
  venue_id?: number,
  league_id?: number,
  season_ids?: number[],
  format_type?: string,
  date_from?: string,
  date_to?: string,
  phase?: 'powerplay' | 'middle' | 'death',
  limit?: number
}
```

DATABASE SOURCES:

Primary: `gold.fact_fixture`, `gold.fact_fixture_run`

Joins: `gold.fact_ball` for phase filters, `gold.dim_team`, `gold.dim_venue`, `gold.dim_league`, `gold.dim_season`, `gold.dim_date`; use the existing head-to-head predicate as a fallback.

RETURN SHAPE:

```ts
{
  component: 'TeamAnalytics',
  data: {
    team: { id, name },
    splits: [{ key, matches, wins, losses, draws, noResults, winRate, runsFor, runsAgainst, nrr }],
    headToHead?: { opponent, matches, teamWins, opponentWins, draws },
    scope: { ...resolvedFilters }
  }
}
```

WHY THIS IS NEEDED: `get_team_data` provides profile, squad, recent form, and one standings row. `compare_entities` provides a limited recent head-to-head list. Neither answers venue splits, opponent splits, phase performance, or bounded multi-season team analytics.

SMART ROUTER INTENTS: `team_analytics`, `team_venue_record`, `team_opponent_record`, `team_performance`, `head_to_head_analysis`

## New tool 6: `get_venue_stats`

PRIORITY: MEDIUM-HIGH

DESCRIPTION: Return venue metadata and match, scoring, batting, and bowling splits for a venue and optional competition/team/format scope.

USER QUESTIONS THIS ANSWERS:

- “What is the average first-innings score at Eden Gardens?”
- “Which teams have the best record at this ground?”
- “Is this venue better for pace or spin?”

INPUT SCHEMA:

```ts
{
  venue_id?: number,
  venue_name?: string, // one required
  data_type: 'profile' | 'team_record' | 'score_patterns' | 'batting' | 'bowling', // required
  team_id?: number,
  league_id?: number,
  season_id?: number,
  format_type?: string,
  date_from?: string,
  date_to?: string,
  limit?: number
}
```

DATABASE SOURCES:

Primary: `gold.dim_venue`, `gold.fact_fixture`, `gold.fact_fixture_run`, `gold.fact_batting`, `gold.fact_bowling`

Joins: `gold.fact_ball`, `gold.dim_team`, `gold.dim_league`, `gold.dim_season`, `gold.dim_date`; optionally `matches.fixture_weather` for a match-specific context, not as a venue-climate authority.

RETURN SHAPE:

```ts
{
  component: 'VenueStats',
  data: {
    venue: { id, name, city, capacity, floodlight },
    matches: { played, completed, homeWins?, awayWins?, draws, noResults },
    scorePatterns?: { averageFirstInnings, averageSecondInnings, highest, lowest, chaseRate },
    teamRecord?: [{ team, matches, wins, losses, draws, winRate }],
    batting?: [{ player, innings, runs, average, strikeRate }],
    bowling?: [{ player, overs, wickets, economy }]
  }
}
```

WHY THIS IS NEEDED: `gold.dim_venue` is not exposed at all, and venue performance requires combining it with fixture and score facts. It answers a distinct venue-centered question category rather than duplicating team profiles.

SMART ROUTER INTENTS: `venue_stats`, `venue_profile`, `ground_record`, `venue_scoring`, `venue_batting`, `venue_bowling`

## New tool 7: `get_rankings`

PRIORITY: MEDIUM

DESCRIPTION: Return ICC-style team rankings by format and gender, optionally scoped to a team or a bounded comparison.

USER QUESTIONS THIS ANSWERS:

- “Who are the top men's T20 teams?”
- “What is India's ODI ranking and rating?”
- “Compare the rankings of Australia and England.”

INPUT SCHEMA:

```ts
{
  format_type: string,       // required, e.g. T20, ODI, Test
  gender?: 'men' | 'women' | 'mixed',
  team_id?: number,
  team_name?: string,
  limit?: number             // 1..50, default 10
}
```

DATABASE SOURCES:

Primary: `master.team_rankings`

Joins: `gold.dim_team` or `master.teams` for names. Do not use `gold.fact_team_ranking`; it is empty.

RETURN SHAPE:

```ts
{
  component: 'RankingsTable',
  data: {
    formatType, gender,
    rows: [{ position, teamId, teamName, points, rating }],
    sourceStatus: 'master.team_rankings',
    isDataPending: boolean
  }
}
```

WHY THIS IS NEEDED: Rankings are the only cataloged user-facing domain with a deliberately empty gold view. A direct master-table tool makes the schema reachable and accurately reports when data is pending.

SMART ROUTER INTENTS: `team_rankings`, `icc_rankings`, `ranking_table`, `team_rating`

## New tool 8: `get_trends`

PRIORITY: MEDIUM-HIGH

DESCRIPTION: Return bounded time-series metrics for a player, team, league, or venue across seasons, months, or match dates.

USER QUESTIONS THIS ANSWERS:

- “How has this player's strike rate changed over the last five seasons?”
- “Show the team's win rate year over year.”
- “Has scoring at this ground increased over time?”

INPUT SCHEMA:

```ts
{
  entity_type: 'player' | 'team' | 'league' | 'venue', // required
  entity_id?: number,
  entity_name?: string,
  metric: 'runs' | 'wickets' | 'average' | 'strike_rate' | 'economy' |
    'win_rate' | 'points' | 'net_run_rate' | 'score', // required
  grain: 'season' | 'month' | 'date',
  league_id?: number,
  format_type?: string,
  season_from?: string,
  season_to?: string,
  date_from?: string,
  date_to?: string,
  venue_id?: number,
  limit?: number // max 60 points
}
```

DATABASE SOURCES:

Primary: `gold.dim_date`, `gold.fact_player_career`, `gold.fact_fixture`, `gold.fact_fixture_run`

Joins: `gold.fact_batting`, `gold.fact_bowling`, `gold.fact_standing`, `gold.dim_player`, `gold.dim_team`, `gold.dim_league`, `gold.dim_season`, `gold.dim_venue`.

RETURN SHAPE:

```ts
{
  component: 'TrendChart',
  data: {
    entity: { type, id, name },
    metric, grain,
    points: [{ period, value, denominator?, label? }],
    scope: { ...resolvedFilters },
    coverage: { firstPeriod, lastPeriod, pointsReturned }
  }
}
```

WHY THIS IS NEEDED: `gold.dim_date` is currently unused and existing career queries return rows, not a normalized trend. This tool handles season-over-season and date-grain questions without making the agent manually aggregate large facts.

SMART ROUTER INTENTS: `trend_analysis`, `season_over_season`, `career_trend`, `team_trend`, `venue_trend`

## New tool 9: `get_live_match_state`

PRIORITY: MEDIUM-HIGH

DESCRIPTION: Return the latest bounded live state for a fixture or team, including snapshot time, status, innings totals, and an optional recent-ball window.

USER QUESTIONS THIS ANSWERS:

- “What is happening in the India match right now?”
- “What was the score at the last live snapshot?”
- “Show the last over in the live game.”

INPUT SCHEMA:

```ts
{
  fixture_id?: number,
  team_id?: number,
  since?: string,
  include_recent_balls?: boolean,
  recent_ball_limit?: number // max 36
}
```

DATABASE SOURCES:

Primary: `matches.livescore_snapshots`

Joins: `matches.fixtures`, `matches.fixture_runs`, `matches.fixture_balls`, `gold.v_fixture_summary`, `gold.dim_team`.

RETURN SHAPE:

```ts
{
  component: 'LiveMatchState',
  data: {
    match: { fixtureId, teams, competition, status, isLive },
    snapshot: { snapshotAt, status, isLive, payloadHash, state: object },
    innings: [{ team, inning, score, wickets, overs }],
    recentBalls?: [{ over, ball, batter, bowler, runs, outcome }],
    freshness: { snapshotAt, ageSeconds }
  }
}
```

WHY THIS IS NEEDED: `livescore_snapshots` is not exposed by any existing tool. Live queries need freshness semantics and a small recent window, which is different from historical `get_match_data` and analytical `get_ball_analysis`.

SMART ROUTER INTENTS: `live_score`, `live_match`, `current_match_state`, `last_over`

## Complete tool inventory

| Tool | Status | Primary coverage |
|---|---|---|
| `get_player_stats` | Existing + enhance | `master.players`, `master.player_career_stats` |
| `get_team_data` | Existing + enhance | `master.teams`, `master.team_squad_members`, `master.standings`, team fixtures |
| `get_match_data` | Existing + enhance | `matches.fixtures`, `fixture_batting`, `fixture_bowling`, `fixture_runs` |
| `get_fixtures` | Existing + enhance | `gold.v_fixture_summary`, `matches.fixtures` |
| `get_league_data` | Existing + enhance | standings, leaderboards, fixtures, seasons, stages, legends |
| `compare_entities` | Existing + enhance | players, teams, fixtures, `gold.fact_ball` matchup |
| `get_insight` | Existing | `insights.pre_computed_insights` |
| `search_cricket_entities` | New | all human-facing dimensions |
| `get_player_match_history` | New | `gold.fact_batting`, `gold.fact_bowling` |
| `get_match_context` | New | lineup, venue, officials, extras, overs, weather, odds |
| `get_ball_analysis` | New | `gold.fact_ball`, phases, dismissals, over summaries |
| `get_team_analytics` | New | team venue/opponent/performance splits |
| `get_venue_stats` | New | venue profile and venue-scoped facts |
| `get_rankings` | New | `master.team_rankings` |
| `get_trends` | New | `gold.dim_date` and time-series facts |
| `get_live_match_state` | New | `matches.livescore_snapshots` |

## Coverage matrix

`E` means directly exposed; `J` means exposed through a join or aggregate; `-` means intentionally not exposed. `Enh.` means the existing tool must be upgraded as described above.

### Master schema

| Table | Tool coverage |
|---|---|
| `master.continents` | `search_cricket_entities` (E/J) |
| `master.countries` | `search_cricket_entities` (E/J); player/team/official context (J) |
| `master.leagues` | `search_cricket_entities`; `get_league_data`; `get_fixtures` (Enh.) |
| `master.seasons` | `search_cricket_entities`; `get_league_data`; `get_trends` |
| `master.stages` | `search_cricket_entities`; `get_league_data` stage_overview (Enh.) |
| `master.teams` | `get_team_data`; `get_fixtures`; `compare_entities`; `search_cricket_entities` |
| `master.players` | `get_player_stats`; `search_cricket_entities`; `get_player_match_history`; `compare_entities` |
| `master.positions` | `search_cricket_entities`; `get_player_stats` filters (Enh.) |
| `master.officials` | `get_match_context`; `search_cricket_entities` |
| `master.venues` | `get_venue_stats`; `get_match_context`; `search_cricket_entities` |
| `master.player_career_stats` | `get_player_stats`; `get_league_data`; `compare_entities`; `get_trends` |
| `master.standings` | `get_team_data`; `get_league_data`; `get_team_analytics` |
| `master.team_rankings` | `get_rankings` (E) |
| `master.team_squad_members` | `get_team_data` squad |
| `master.legends` | `get_league_data` stage_overview (Enh.) |
| `master.score_outcomes` | `get_ball_analysis`; `get_match_context` extras |
| `master.scoreboard_innings` | `get_match_context` overs/live sections |

### Matches schema

| Table | Tool coverage |
|---|---|
| `matches.fixtures` | `get_fixtures`; `get_match_data`; `get_match_context`; `get_live_match_state`; analytics joins |
| `matches.fixture_balls` | `compare_entities`; `get_ball_analysis`; `get_live_match_state` recent window |
| `matches.fixture_batting` | `get_match_data`; `get_player_match_history` |
| `matches.fixture_bowling` | `get_match_data`; `get_player_match_history` |
| `matches.fixture_inning_overs` | `get_match_context` overs; `get_ball_analysis` shortcut |
| `matches.fixture_lineups` | `get_match_context` lineup |
| `matches.fixture_runs` | `get_match_data`; `get_match_context`; `get_team_analytics`; `get_venue_stats`; `get_trends` |
| `matches.fixture_scoreboards` | `get_match_context` extras |
| `matches.fixture_odds` | `get_match_context` odds, subject to access control |
| `matches.fixture_weather` | `get_match_context` weather |
| `matches.livescore_snapshots` | `get_live_match_state`; `get_match_context` live_state |

### Gold schema

| View | Tool coverage |
|---|---|
| `gold.dim_continent` | `search_cricket_entities` |
| `gold.dim_country` | `search_cricket_entities`; context joins |
| `gold.dim_date` | `get_trends`; history/context date labels |
| `gold.dim_league` | `search_cricket_entities`; league/fixture/history joins |
| `gold.dim_official` | `get_match_context`; entity search |
| `gold.dim_player` | player stats/history, ball analysis, entity search |
| `gold.dim_position` | entity search; player filters |
| `gold.dim_season` | entity search; league/history/trends |
| `gold.dim_stage` | league stage filters and match context |
| `gold.dim_team` | all team/fixture/history/analytics tools |
| `gold.dim_venue` | `get_venue_stats`; match context; history/analytics joins |
| `gold.fact_ball` | `get_ball_analysis`; matchup comparison; live sample |
| `gold.fact_batting` | `get_player_match_history`; match scorecard/history |
| `gold.fact_bowling` | `get_player_match_history`; match scorecard/history |
| `gold.fact_fixture` | fixtures, match context, team/venue analytics, trends |
| `gold.fact_fixture_run` | scorecard, context, analytics, venue stats, trends |
| `gold.fact_lineup` | `get_match_context` lineup |
| `gold.fact_player_career` | player stats, league leaderboard, trends |
| `gold.fact_standing` | league/team standings and analytics |
| `gold.fact_team_ranking` | Not queried: empty view. `get_rankings` uses `master.team_rankings`. |
| `gold.v_fixture_summary` | `get_fixtures` (preferred); match context and live joins |

### Insights schema

| Table | Tool coverage |
|---|---|
| `insights.pre_computed_insights` | `get_insight` |

### Remaining intentional gaps

- `gold.fact_team_ranking` remains empty by design; the ranking tool reports the master-table source and pending-data state.
- Weather and odds JSON fields may be provider-specific. Normalize common fields, preserve the raw object only when safe, and report `unknown` rather than inventing missing values.
- `get_live_match_state` is only as fresh as the latest snapshot. Always return `snapshotAt` and age.
- The internal `raw`, `etl`, `stats`, and application `public` schemas remain out of scope by requirement.

## Priority ordering

| Order | Work item | Why now | Complexity |
|---:|---|---|---|
| 0 | Enhance `get_match_data`, `get_fixtures`, `get_league_data`, `get_player_stats` | Improves every existing fast path and removes ID/name follow-up calls | Medium |
| 1 | `get_match_context` | Unlocks lineup, officials, venue, extras, overs, weather, and odds questions across every fixture | Medium-High |
| 2 | `get_player_match_history` | Unlocks the most common missing player questions and uses two large facts | Medium |
| 3 | `get_ball_analysis` | Unlocks phase/death/powerplay/dismissal analytics from 1.1M balls | High |
| 4 | `get_team_analytics` | Unlocks venue/opponent/team performance questions with one aggregate call | Medium-High |
| 5 | `get_trends` | Makes season-over-season and date questions first-class and exposes `dim_date` | Medium-High |
| 6 | `search_cricket_entities` | Reduces tool chains and enables reference-data questions | Medium |
| 7 | `get_live_match_state` | Needed for current-match questions; freshness and polling semantics add complexity | Medium |
| 8 | `get_venue_stats` | Broad venue coverage, but lower query frequency than player/team/match questions | High |
| 9 | `get_rankings` | Small implementation and clear data gap, but ranking data is currently pending | Low |

## Router intent additions

Add the new intents to `libs/smart-router/src/types.ts`, then add direct fast paths only when the query contains a resolvable entity and bounded scope. Ambiguous natural-language questions should go to the agent with the intent as a hint.

| Intent | Fast-path condition | Tool |
|---|---|---|
| `entity_lookup` | explicit search/find/list entity request | `search_cricket_entities` |
| `player_match_history` | player name plus last innings/match-by-match/history | `get_player_match_history` |
| `match_context` | fixture ID plus lineup/venue/officials/extras/weather/overs | `get_match_context` |
| `ball_analysis` | fixture/team/player plus phase/over/powerplay/death/dismissal | `get_ball_analysis` |
| `team_analytics` | team plus venue split/opponent record/performance | `get_team_analytics` |
| `venue_stats` | named venue/ground plus stats/record/scoring | `get_venue_stats` |
| `team_rankings` | ranking/rating/ICC plus format/gender | `get_rankings` |
| `trend_analysis` | over time/year-on-year/season trend | `get_trends` |
| `live_score` | live/current/now/last over | `get_live_match_state` |

The current router already handles player stats, standings, leaderboards, match scorecards, head-to-head, and dismissal analysis. Preserve those routes and ensure new patterns are checked before the generic AI-path signals when the query is a bounded factual lookup.

## Five call-flow examples

### 1. Final context plus scorecard

User: “Who played in the IPL 2024 final, what was the scorecard, toss, weather, and extras?”

Before the new tools:

1. `get_league_data({ data_type: 'fixtures', league_id, season_id })`
2. `get_match_data({ fixture_id })`
3. The lineup, toss names, weather, extras, and officials are unavailable; the agent must say so.

After the new tools:

1. `get_league_data({ data_type: 'fixtures', league_id, season_id, stage_type: 'final' })`
2. `get_match_data({ fixture_id })`
3. `get_match_context({ fixture_id, sections: ['lineup', 'venue', 'officials', 'extras', 'weather'] })`

The answer is complete in three calls and each response is already named.

### 2. Two players by season and last innings

User: “Compare Kohli and Rohit in IPL batting by season, then show their last five innings.”

Before the new tools:

1. `get_player_stats({ name: 'Virat Kohli', league_id })`
2. `get_player_stats({ name: 'Rohit Sharma', league_id })`
3. `compare_entities(...)` can compare aggregates, but last innings are not exposed.

After the new tools:

1. `compare_entities({ comparison_type: 'player_vs_player', entity_a_id, entity_b_id, league_id, format_type: 'T20' })`
2. `get_player_match_history({ player_id: entity_a_id, data_type: 'batting', league_id, limit: 5 })`
3. `get_player_match_history({ player_id: entity_b_id, data_type: 'batting', league_id, limit: 5 })`

### 3. Team venue and opponent analysis

User: “How does Mumbai Indians perform at Wankhede versus away, and what is their head-to-head record against CSK?”

Before the new tools:

1. `get_team_data({ data_type: 'form' })` gives recent form only.
2. `compare_entities({ comparison_type: 'team_vs_team', ... })` gives a fixture list and a limited win count.
3. Venue split and away comparison are unavailable.

After the new tools:

1. `get_team_analytics({ team_name: 'Mumbai Indians', data_type: 'venue_split', venue_id, league_id })`
2. `get_team_analytics({ team_name: 'Mumbai Indians', data_type: 'head_to_head', opponent_team_id: cskId, league_id })`

### 4. Death-over bowling analysis

User: “Break down Bumrah's IPL death-over economy, wickets, and dismissal types.”

Before the new tools:

1. `get_player_stats` returns career aggregates but no phase data.
2. `compare_entities` requires a batsman-vs-bowler pair, so it cannot answer this.

After the new tools:

1. `get_ball_analysis({ player_id: bumrahId, league_id, format_type: 'T20', analysis_type: 'phase', phase: 'death' })`

One bounded aggregate call answers the question.

### 5. Current ranking and live state

User: “Who is top in men's T20 cricket, and what is happening in India's live match?”

Before the new tools:

1. No ranking tool exists.
2. No live snapshot tool exists.

After the new tools:

1. `get_rankings({ format_type: 'T20', gender: 'men', limit: 10 })`
2. `get_live_match_state({ team_id: indiaId, include_recent_balls: true, recent_ball_limit: 6 })`

The agent should label the two independent data timestamps and never imply that a stale snapshot is live.

## Implementation contract

Each tool should follow the existing package pattern:

- Add a Zod input schema in `libs/mcp-server/src/schemas/tool-schemas.ts`.
- Add a database query module or query function under `libs/database/src/queries/` and export it from `libs/database/src/index.ts`.
- Prefer one read-pool query or a small `Promise.all` of bounded queries; use named projections and parameterized SQL.
- Add a handler in `libs/mcp-server/src/tools/tool-handlers.ts`, a registration wrapper, and `executeCricketTool` dispatch.
- Keep `structuredContent` JSON-compatible and preserve the existing `{ component, data }` response convention.
- Add the same schema and description to `libs/ai-agent/src/tool-executor.ts`, or generate Bedrock tool definitions from the MCP manifest to avoid drift.
- Add router intent types, classifier patterns, and fast-path execution only for resolvable, bounded queries.
- Exclude placeholder players at the query layer and include `coverage`/`dataFreshness` when the source is partial or stale.
- Add unit tests for Zod validation, placeholder filtering, stage/season resolution, empty ranking data, and live snapshot age. Add integration tests against representative fixtures for lineup, extras, venue, and phase aggregation.
