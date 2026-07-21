import type { Pool } from 'pg';
import { executeJob } from './job-utils.js';

const UPSERT_PLAYER_MATCHUPS_SQL = `
INSERT INTO insights.player_matchup (
  batsman_id,
  bowler_id,
  format_type,
  league_id,
  balls_faced,
  runs_scored,
  dismissals,
  dots,
  fours,
  sixes,
  computed_at
)
SELECT
  b.batsman_striker_id AS batsman_id,
  b.bowler_id,
  COALESCE(NULLIF(f.match_format, ''), 'unknown') AS format_type,
  f.league_id,
  COUNT(*) AS balls_faced,
  COALESCE(SUM(so.runs), 0)::integer AS runs_scored,
  COUNT(*) FILTER (WHERE b.batsman_out_id = b.batsman_striker_id)::integer AS dismissals,
  COUNT(*) FILTER (
    WHERE COALESCE(so.runs, 0) = 0
      AND COALESCE(so.name, '') NOT IN ('wide', 'noball', 'no ball')
  )::integer AS dots,
  COUNT(*) FILTER (WHERE so.is_four = true)::integer AS fours,
  COUNT(*) FILTER (WHERE so.is_six = true)::integer AS sixes,
  now() AS computed_at
FROM matches.fixture_balls b
JOIN matches.fixtures f
  ON f.sportmonks_id = b.fixture_id
LEFT JOIN master.score_outcomes so
  ON so.sportmonks_id = b.score_outcome_id
WHERE b.bowler_id IS NOT NULL
  AND b.batsman_striker_id IS NOT NULL
GROUP BY
  b.batsman_striker_id,
  b.bowler_id,
  COALESCE(NULLIF(f.match_format, ''), 'unknown'),
  f.league_id
ON CONFLICT (batsman_id, bowler_id, format_type, league_id) DO UPDATE SET
  balls_faced = EXCLUDED.balls_faced,
  runs_scored = EXCLUDED.runs_scored,
  dismissals = EXCLUDED.dismissals,
  dots = EXCLUDED.dots,
  fours = EXCLUDED.fours,
  sixes = EXCLUDED.sixes,
  computed_at = EXCLUDED.computed_at;
`;

/**
 * Aggregate batsman-vs-bowler stats from ball-by-ball data.
 */
export async function computePlayerMatchups(pool: Pool) {
  return executeJob('player-matchups', pool, async (activePool) => {
    const result = await activePool.query(UPSERT_PLAYER_MATCHUPS_SQL);
    return result.rowCount ?? 0;
  });
}
