-- Insights schema: pre-aggregated cricket analytics, matchups, and cached UI manifests.
-- Depends on master.* and matches.* schemas (created outside Flyway).

CREATE SCHEMA IF NOT EXISTS insights;

-- ---------------------------------------------------------------------------
-- player_season_agg: denormalized player career stats per season/format
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW insights.player_season_agg AS
SELECT
    pcs.player_id,
    p.fullname AS player_name,
    p.image_path AS player_image,
    pos.name AS position,
    p.battingstyle,
    p.bowlingstyle,
    c.name AS country,
    c.image_path AS country_flag,
    pcs.season_id,
    s.name AS season_name,
    s.league_id,
    l.name AS league_name,
    pcs.format_type,
    pcs.batting_matches,
    pcs.batting_innings,
    pcs.batting_runs,
    pcs.batting_not_outs,
    pcs.batting_highest_score,
    pcs.batting_strike_rate,
    pcs.batting_balls_faced,
    pcs.batting_average,
    pcs.batting_fours,
    pcs.batting_sixes,
    pcs.batting_fifties,
    pcs.batting_hundreds,
    pcs.batting_fow_score,
    pcs.batting_fow_balls,
    pcs.bowling_matches,
    pcs.bowling_overs,
    pcs.bowling_innings,
    pcs.bowling_average,
    pcs.bowling_economy_rate,
    pcs.bowling_maidens,
    pcs.bowling_runs,
    pcs.bowling_wickets,
    pcs.bowling_wides,
    pcs.bowling_noballs,
    pcs.bowling_strike_rate,
    pcs.bowling_four_wickets,
    pcs.bowling_five_wickets,
    pcs.bowling_ten_wickets,
    pcs.bowling_rate
FROM master.player_career_stats pcs
JOIN master.players p
    ON p.sportmonks_id = pcs.player_id
JOIN master.seasons s
    ON s.sportmonks_id = pcs.season_id
JOIN master.leagues l
    ON l.sportmonks_id = s.league_id
LEFT JOIN master.positions pos
    ON pos.sportmonks_id = p.position_id
LEFT JOIN master.countries c
    ON c.sportmonks_id = p.country_id
WHERE p.is_active = true;

CREATE UNIQUE INDEX uq_player_season_agg_player_season_format
    ON insights.player_season_agg (player_id, season_id, format_type);

CREATE INDEX idx_player_season_agg_league_format
    ON insights.player_season_agg (league_id, format_type);

CREATE INDEX idx_player_season_agg_player_name
    ON insights.player_season_agg (player_name);

-- ---------------------------------------------------------------------------
-- venue_stats: venue-level aggregates by match format
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW insights.venue_stats AS
WITH first_innings AS (
    SELECT
        fr.fixture_id,
        fr.team_id AS bat_first_team_id,
        fr.score AS first_innings_score
    FROM matches.fixture_runs fr
    WHERE fr.inning = 1
),
fixture_metrics AS (
    SELECT
        f.venue_id,
        f.match_format,
        f.sportmonks_id AS fixture_id,
        f.toss_won_team_id,
        f.winner_team_id,
        fi.first_innings_score,
        fi.bat_first_team_id,
        CASE
            WHEN fi.bat_first_team_id IS NOT NULL
                 AND f.winner_team_id IS NOT NULL
                 AND fi.bat_first_team_id = f.winner_team_id
            THEN 1
            ELSE 0
        END AS bat_first_won,
        CASE
            WHEN f.toss_won_team_id IS NOT NULL
                 AND f.winner_team_id IS NOT NULL
                 AND f.toss_won_team_id = f.winner_team_id
            THEN 1
            ELSE 0
        END AS toss_winner_won,
        CASE
            WHEN fi.bat_first_team_id IS NOT NULL
                 AND f.winner_team_id IS NOT NULL
            THEN 1
            ELSE 0
        END AS bat_first_decidable,
        CASE
            WHEN f.toss_won_team_id IS NOT NULL
                 AND f.winner_team_id IS NOT NULL
            THEN 1
            ELSE 0
        END AS toss_decidable
    FROM matches.fixtures f
    LEFT JOIN first_innings fi
        ON fi.fixture_id = f.sportmonks_id
    WHERE f.is_active = true
      AND f.venue_id IS NOT NULL
)
SELECT
    v.sportmonks_id AS venue_id,
    v.name AS venue_name,
    v.city,
    v.capacity,
    c.name AS country,
    fm.match_format,
    COUNT(DISTINCT fm.fixture_id) AS total_matches,
    ROUND(
        AVG(fm.first_innings_score) FILTER (WHERE fm.first_innings_score IS NOT NULL),
        2
    ) AS avg_first_innings_score,
    ROUND(
        100.0 * SUM(fm.bat_first_won)::numeric
            / NULLIF(SUM(fm.bat_first_decidable), 0),
        2
    ) AS bat_first_percentage,
    ROUND(
        100.0 * SUM(fm.toss_winner_won)::numeric
            / NULLIF(SUM(fm.toss_decidable), 0),
        2
    ) AS toss_winner_win_percentage
FROM fixture_metrics fm
JOIN master.venues v
    ON v.sportmonks_id = fm.venue_id
LEFT JOIN master.countries c
    ON c.sportmonks_id = v.country_id
GROUP BY
    v.sportmonks_id,
    v.name,
    v.city,
    v.capacity,
    c.name,
    fm.match_format;

CREATE UNIQUE INDEX uq_venue_stats_venue_format
    ON insights.venue_stats (venue_id, match_format);

CREATE INDEX idx_venue_stats_match_format
    ON insights.venue_stats (match_format);

CREATE INDEX idx_venue_stats_country
    ON insights.venue_stats (country);

-- ---------------------------------------------------------------------------
-- team_head_to_head: pre-computed team vs team records (ETL-populated)
-- ---------------------------------------------------------------------------
CREATE TABLE insights.team_head_to_head (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_a_id BIGINT NOT NULL,
    team_b_id BIGINT NOT NULL,
    league_id BIGINT NOT NULL,
    format_type TEXT NOT NULL,
    total_matches INTEGER NOT NULL DEFAULT 0,
    team_a_wins INTEGER NOT NULL DEFAULT 0,
    team_b_wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    no_results INTEGER NOT NULL DEFAULT 0,
    team_a_avg_score NUMERIC(8, 2),
    team_b_avg_score NUMERIC(8, 2),
    last_match_date TIMESTAMPTZ,
    last_winner_id BIGINT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_team_head_to_head_canonical_order CHECK (team_a_id < team_b_id),
    CONSTRAINT uq_team_head_to_head UNIQUE (team_a_id, team_b_id, league_id, format_type),
    CONSTRAINT fk_team_head_to_head_team_a
        FOREIGN KEY (team_a_id) REFERENCES master.teams (sportmonks_id),
    CONSTRAINT fk_team_head_to_head_team_b
        FOREIGN KEY (team_b_id) REFERENCES master.teams (sportmonks_id),
    CONSTRAINT fk_team_head_to_head_league
        FOREIGN KEY (league_id) REFERENCES master.leagues (sportmonks_id),
    CONSTRAINT fk_team_head_to_head_last_winner
        FOREIGN KEY (last_winner_id) REFERENCES master.teams (sportmonks_id)
);

CREATE INDEX idx_team_head_to_head_team_a
    ON insights.team_head_to_head (team_a_id);

CREATE INDEX idx_team_head_to_head_team_b
    ON insights.team_head_to_head (team_b_id);

CREATE INDEX idx_team_head_to_head_league_format
    ON insights.team_head_to_head (league_id, format_type);

CREATE INDEX idx_team_head_to_head_computed_at
    ON insights.team_head_to_head (computed_at DESC);

-- ---------------------------------------------------------------------------
-- player_matchup: pre-computed batsman vs bowler records (ETL-populated)
-- ---------------------------------------------------------------------------
CREATE TABLE insights.player_matchup (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batsman_id BIGINT NOT NULL,
    bowler_id BIGINT NOT NULL,
    format_type TEXT NOT NULL,
    league_id BIGINT,
    balls_faced INTEGER NOT NULL DEFAULT 0,
    runs_scored INTEGER NOT NULL DEFAULT 0,
    dismissals INTEGER NOT NULL DEFAULT 0,
    dots INTEGER NOT NULL DEFAULT 0,
    fours INTEGER NOT NULL DEFAULT 0,
    sixes INTEGER NOT NULL DEFAULT 0,
    strike_rate NUMERIC(8, 2) GENERATED ALWAYS AS (
        CASE
            WHEN balls_faced > 0
            THEN ROUND((runs_scored::numeric / balls_faced) * 100, 2)
            ELSE NULL
        END
    ) STORED,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_player_matchup UNIQUE NULLS NOT DISTINCT (
        batsman_id, bowler_id, format_type, league_id
    ),
    CONSTRAINT fk_player_matchup_batsman
        FOREIGN KEY (batsman_id) REFERENCES master.players (sportmonks_id),
    CONSTRAINT fk_player_matchup_bowler
        FOREIGN KEY (bowler_id) REFERENCES master.players (sportmonks_id),
    CONSTRAINT fk_player_matchup_league
        FOREIGN KEY (league_id) REFERENCES master.leagues (sportmonks_id)
);

CREATE INDEX idx_player_matchup_batsman
    ON insights.player_matchup (batsman_id);

CREATE INDEX idx_player_matchup_bowler
    ON insights.player_matchup (bowler_id);

CREATE INDEX idx_player_matchup_league_format
    ON insights.player_matchup (league_id, format_type);

CREATE INDEX idx_player_matchup_strike_rate
    ON insights.player_matchup (strike_rate DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- pre_computed_insights: cached insight payloads for Generative UI
-- ---------------------------------------------------------------------------
CREATE TABLE insights.pre_computed_insights (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    insight_type TEXT NOT NULL,
    insight_key TEXT NOT NULL,
    ui_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
    narrative TEXT,
    data_hash TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_pre_computed_insights UNIQUE (insight_type, insight_key)
);

CREATE INDEX idx_pre_computed_insights_type
    ON insights.pre_computed_insights (insight_type);

CREATE INDEX idx_pre_computed_insights_expires_at
    ON insights.pre_computed_insights (expires_at)
    WHERE expires_at IS NOT NULL;

CREATE INDEX idx_pre_computed_insights_computed_at
    ON insights.pre_computed_insights (computed_at DESC);

CREATE INDEX idx_pre_computed_insights_ui_manifest_gin
    ON insights.pre_computed_insights USING gin (ui_manifest);

-- ---------------------------------------------------------------------------
-- Fuzzy player name search (pg_trgm)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_players_fullname_trgm
    ON master.players USING gin (fullname gin_trgm_ops);
