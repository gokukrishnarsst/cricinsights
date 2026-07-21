import { getReadPool } from '../client.js';
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  SportmonksId,
  Standing,
} from '../types/cricket.js';
import { toInt, toNumber } from '../types/cricket.js';

function mapStanding(row: Record<string, unknown>): Standing {
  const recentForm = row.recent_form;
  return {
    teamId: toInt(row.team_id)!,
    teamName: String(row.team_name),
    teamCode: row.team_code ? String(row.team_code) : null,
    leagueId: toInt(row.league_id)!,
    seasonId: toInt(row.season_id)!,
    stageId: toInt(row.stage_id)!,
    position: toInt(row.position),
    points: toInt(row.points),
    played: toInt(row.played),
    won: toInt(row.won),
    lost: toInt(row.lost),
    draw: toInt(row.draw),
    noresult: toInt(row.noresult),
    netRunRate: toNumber(row.net_run_rate),
    recentForm: Array.isArray(recentForm) ? recentForm.map(String) : null,
  };
}

/**
 * League standings for a season ordered by table position.
 * @param leagueId - `master.leagues.sportmonks_id`
 * @param seasonId - `master.seasons.sportmonks_id`
 */
export async function getStandings(
  leagueId: SportmonksId,
  seasonId: SportmonksId,
): Promise<Standing[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT st.team_id, t.name AS team_name, t.code AS team_code,
            st.league_id, st.season_id, st.stage_id, st.position, st.points,
            st.played, st.won, st.lost, st.draw, st.noresult,
            st.net_run_rate, st.recent_form
     FROM master.standings st
     JOIN master.teams t ON t.sportmonks_id = st.team_id
     WHERE st.league_id = $1 AND st.season_id = $2
     ORDER BY st.position NULLS LAST, st.points DESC NULLS LAST`,
    [leagueId, seasonId],
  );
  return rows.map(mapStanding);
}

const LEADERBOARD_LIMIT = 20;

function playerMetricColumn(metric: LeaderboardMetric): string | null {
  switch (metric) {
    case 'batting_runs':
      return 'pcs.batting_runs';
    case 'batting_wickets':
      return 'pcs.bowling_wickets';
    case 'bowling_wickets':
      return 'pcs.bowling_wickets';
    case 'strike_rate':
      return 'pcs.batting_strike_rate';
    case 'economy_rate':
      return 'pcs.bowling_economy_rate';
    default:
      return null;
  }
}

/**
 * Top performers or teams for a league season by metric.
 * Player metrics aggregate from `master.player_career_stats`; `net_run_rate` uses standings.
 * @param leagueId - `master.leagues.sportmonks_id`
 * @param seasonId - `master.seasons.sportmonks_id`
 * @param metric - Statistic to rank by
 */
export async function getLeaderboard(
  leagueId: SportmonksId,
  seasonId: SportmonksId,
  metric: LeaderboardMetric,
): Promise<LeaderboardEntry[]> {
  const pool = await getReadPool();

  if (metric === 'net_run_rate') {
    const { rows } = await pool.query<Record<string, unknown>>(
      `SELECT st.team_id, t.name AS team_name, st.net_run_rate,
              ROW_NUMBER() OVER (ORDER BY st.net_run_rate DESC NULLS LAST) AS rank
       FROM master.standings st
       JOIN master.teams t ON t.sportmonks_id = st.team_id
       WHERE st.league_id = $1 AND st.season_id = $2
       ORDER BY st.net_run_rate DESC NULLS LAST
       LIMIT $3`,
      [leagueId, seasonId, LEADERBOARD_LIMIT],
    );
    return rows.map((row) => ({
      rank: toInt(row.rank)!,
      teamId: toInt(row.team_id)!,
      teamName: String(row.team_name),
      metric,
      value: toNumber(row.net_run_rate) ?? 0,
    }));
  }

  const column = playerMetricColumn(metric);
  if (!column) {
    return [];
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT pcs.player_id, p.fullname AS player_name, pcs.format_type,
            ${column} AS metric_value,
            ROW_NUMBER() OVER (ORDER BY ${column} DESC NULLS LAST) AS rank
     FROM master.player_career_stats pcs
     JOIN master.seasons s ON s.sportmonks_id = pcs.season_id
     JOIN master.players p ON p.sportmonks_id = pcs.player_id
     WHERE s.league_id = $1 AND s.sportmonks_id = $2
       AND ${column} IS NOT NULL
     ORDER BY ${column} DESC NULLS LAST
     LIMIT $3`,
    [leagueId, seasonId, LEADERBOARD_LIMIT],
  );

  return rows.map((row) => ({
    rank: toInt(row.rank)!,
    playerId: toInt(row.player_id)!,
    playerName: String(row.player_name),
    formatType: row.format_type ? String(row.format_type) : undefined,
    metric,
    value: toNumber(row.metric_value) ?? 0,
  }));
}
