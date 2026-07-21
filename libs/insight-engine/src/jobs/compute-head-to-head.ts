import type { Pool } from 'pg';
import { executeJob } from './job-utils.js';

const UPSERT_HEAD_TO_HEAD_SQL = `
WITH pair_fixtures AS (
  SELECT
    LEAST(f.localteam_id, f.visitorteam_id) AS team_a_id,
    GREATEST(f.localteam_id, f.visitorteam_id) AS team_b_id,
    f.league_id,
    COALESCE(NULLIF(f.match_format, ''), 'unknown') AS format_type,
    f.sportmonks_id AS fixture_id,
    f.localteam_id,
    f.visitorteam_id,
    f.winner_team_id,
    f.draw_noresult,
    f.status,
    f.starting_at
  FROM matches.fixtures f
  WHERE f.is_active = true
),
fixture_scores AS (
  SELECT
    pf.fixture_id,
    pf.team_a_id,
    pf.team_b_id,
    pf.league_id,
    pf.format_type,
    pf.winner_team_id,
    pf.draw_noresult,
    pf.status,
    pf.starting_at,
    MAX(fr.score) FILTER (WHERE fr.team_id = pf.team_a_id) AS team_a_score,
    MAX(fr.score) FILTER (WHERE fr.team_id = pf.team_b_id) AS team_b_score
  FROM pair_fixtures pf
  LEFT JOIN matches.fixture_runs fr
    ON fr.fixture_id = pf.fixture_id
  GROUP BY
    pf.fixture_id,
    pf.team_a_id,
    pf.team_b_id,
    pf.league_id,
    pf.format_type,
    pf.winner_team_id,
    pf.draw_noresult,
    pf.status,
    pf.starting_at
),
aggregated AS (
  SELECT
    fs.team_a_id,
    fs.team_b_id,
    fs.league_id,
    fs.format_type,
    COUNT(*) AS total_matches,
    COUNT(*) FILTER (WHERE fs.winner_team_id = fs.team_a_id) AS team_a_wins,
    COUNT(*) FILTER (WHERE fs.winner_team_id = fs.team_b_id) AS team_b_wins,
    COUNT(*) FILTER (
      WHERE fs.draw_noresult ILIKE 'draw%'
         OR fs.status ILIKE '%draw%'
    ) AS draws,
    COUNT(*) FILTER (
      WHERE fs.winner_team_id IS NULL
        AND (
          fs.draw_noresult ILIKE 'n/r%'
          OR fs.draw_noresult ILIKE 'no result%'
          OR fs.status ILIKE '%abandon%'
          OR fs.status ILIKE '%no result%'
        )
    ) AS no_results,
    ROUND(AVG(fs.team_a_score) FILTER (WHERE fs.team_a_score IS NOT NULL), 2) AS team_a_avg_score,
    ROUND(AVG(fs.team_b_score) FILTER (WHERE fs.team_b_score IS NOT NULL), 2) AS team_b_avg_score,
    MAX(fs.starting_at) AS last_match_date,
    (
      SELECT fs2.winner_team_id
      FROM fixture_scores fs2
      WHERE fs2.team_a_id = fs.team_a_id
        AND fs2.team_b_id = fs.team_b_id
        AND fs2.league_id = fs.league_id
        AND fs2.format_type = fs.format_type
        AND fs2.starting_at IS NOT NULL
      ORDER BY fs2.starting_at DESC
      LIMIT 1
    ) AS last_winner_id
  FROM fixture_scores fs
  GROUP BY fs.team_a_id, fs.team_b_id, fs.league_id, fs.format_type
)
INSERT INTO insights.team_head_to_head (
  team_a_id,
  team_b_id,
  league_id,
  format_type,
  total_matches,
  team_a_wins,
  team_b_wins,
  draws,
  no_results,
  team_a_avg_score,
  team_b_avg_score,
  last_match_date,
  last_winner_id,
  computed_at
)
SELECT
  team_a_id,
  team_b_id,
  league_id,
  format_type,
  total_matches,
  team_a_wins,
  team_b_wins,
  draws,
  no_results,
  team_a_avg_score,
  team_b_avg_score,
  last_match_date,
  last_winner_id,
  now()
FROM aggregated
ON CONFLICT (team_a_id, team_b_id, league_id, format_type) DO UPDATE SET
  total_matches = EXCLUDED.total_matches,
  team_a_wins = EXCLUDED.team_a_wins,
  team_b_wins = EXCLUDED.team_b_wins,
  draws = EXCLUDED.draws,
  no_results = EXCLUDED.no_results,
  team_a_avg_score = EXCLUDED.team_a_avg_score,
  team_b_avg_score = EXCLUDED.team_b_avg_score,
  last_match_date = EXCLUDED.last_match_date,
  last_winner_id = EXCLUDED.last_winner_id,
  computed_at = EXCLUDED.computed_at;
`;

/**
 * Compute and upsert canonical team head-to-head records.
 */
export async function computeHeadToHead(pool: Pool) {
  return executeJob('head-to-head', pool, async (activePool) => {
    const result = await activePool.query(UPSERT_HEAD_TO_HEAD_SQL);
    return result.rowCount ?? 0;
  });
}
