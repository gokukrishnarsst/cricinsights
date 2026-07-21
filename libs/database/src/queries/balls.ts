import { getReadPool } from '../client.js';
import type { Ball, MatchupStats, SportmonksId } from '../types/cricket.js';
import { toInt, toNumber, toString } from '../types/cricket.js';

function mapBall(row: Record<string, unknown>): Ball {
  return {
    sportmonksId: toInt(row.sportmonks_id)!,
    fixtureId: toInt(row.fixture_id)!,
    teamId: toInt(row.team_id)!,
    ballNumber: toNumber(row.ball_number) ?? 0,
    scoreboard: toString(row.scoreboard),
    batsmanStrikerId: toInt(row.batsman_striker_id),
    batsmanNonStrikerId: toInt(row.batsman_non_striker_id),
    batsmanScorerId: toInt(row.batsman_scorer_id),
    bowlerId: toInt(row.bowler_id),
    batsmanOutId: toInt(row.batsman_out_id),
    scoreOutcomeId: toInt(row.score_outcome_id),
    scoreOutcomeName: toString(row.score_outcome_name),
    scoreOutcomeRuns: toInt(row.score_outcome_runs),
  };
}

/**
 * Ball-by-ball data for a fixture, optionally filtered by scoreboard (innings).
 * @param fixtureId - `matches.fixtures.sportmonks_id`
 * @param scoreboard - Optional innings/scoreboard code (e.g. `S1`, `S2`)
 */
export async function getFixtureBalls(
  fixtureId: SportmonksId,
  scoreboard?: string,
): Promise<Ball[]> {
  const pool = await getReadPool();
  const params: unknown[] = [fixtureId];
  let scoreboardClause = '';
  if (scoreboard !== undefined) {
    params.push(scoreboard);
    scoreboardClause = ` AND b.scoreboard = $${params.length}`;
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT b.sportmonks_id, b.fixture_id, b.team_id, b.ball_number, b.scoreboard,
            b.batsman_striker_id, b.batsman_non_striker_id, b.batsman_scorer_id,
            b.bowler_id, b.batsman_out_id, b.score_outcome_id,
            so.name AS score_outcome_name, so.runs AS score_outcome_runs
     FROM matches.fixture_balls b
     LEFT JOIN master.score_outcomes so ON so.sportmonks_id = b.score_outcome_id
     WHERE b.fixture_id = $1${scoreboardClause}
     ORDER BY b.scoreboard, b.ball_number`,
    params,
  );
  return rows.map(mapBall);
}

/**
 * Aggregated batsman vs bowler matchup stats from ball-by-ball data.
 * @param batsmanId - `master.players.sportmonks_id`
 * @param bowlerId - `master.players.sportmonks_id`
 * @param leagueId - Optional `master.leagues.sportmonks_id` scope
 */
export async function getPlayerMatchup(
  batsmanId: SportmonksId,
  bowlerId: SportmonksId,
  leagueId?: SportmonksId,
): Promise<MatchupStats> {
  const pool = await getReadPool();
  const params: unknown[] = [batsmanId, bowlerId];
  let leagueJoin = '';
  let leagueFilter = '';

  if (leagueId !== undefined) {
    leagueJoin = 'JOIN matches.fixtures f ON f.sportmonks_id = b.fixture_id';
    leagueFilter = ' AND f.league_id = $3';
    params.push(leagueId);
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT
       $1::bigint AS batsman_id,
       $2::bigint AS bowler_id,
       ${leagueId !== undefined ? '$3::bigint' : 'NULL::bigint'} AS league_id,
       COUNT(*) AS balls_faced,
       COALESCE(SUM(so.runs), 0) AS runs_scored,
       COUNT(*) FILTER (WHERE b.batsman_out_id = $1) AS dismissals,
       COUNT(*) FILTER (WHERE so.is_four = true) AS fours,
       COUNT(*) FILTER (WHERE so.is_six = true) AS sixes
     FROM matches.fixture_balls b
     LEFT JOIN master.score_outcomes so ON so.sportmonks_id = b.score_outcome_id
     ${leagueJoin}
     WHERE b.bowler_id = $2
       AND (b.batsman_striker_id = $1 OR b.batsman_scorer_id = $1)${leagueFilter}`,
    params,
  );

  const row = rows[0] ?? {};
  const ballsFaced = toInt(row.balls_faced) ?? 0;
  const runsScored = toInt(row.runs_scored) ?? 0;

  return {
    batsmanId,
    bowlerId,
    leagueId: leagueId ?? null,
    ballsFaced,
    runsScored,
    dismissals: toInt(row.dismissals) ?? 0,
    fours: toInt(row.fours) ?? 0,
    sixes: toInt(row.sixes) ?? 0,
    strikeRate: ballsFaced > 0 ? (runsScored / ballsFaced) * 100 : null,
  };
}
