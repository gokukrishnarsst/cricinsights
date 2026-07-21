import { getReadPool } from '../client.js';
import type { BattingEntry, SportmonksId } from '../types/cricket.js';
import { toBool, toInt, toNumber, toString } from '../types/cricket.js';

function mapBattingEntry(row: Record<string, unknown>): BattingEntry {
  return {
    sportmonksId: toInt(row.sportmonks_id)!,
    fixtureId: toInt(row.fixture_id)!,
    teamId: toInt(row.team_id)!,
    playerId: toInt(row.player_id)!,
    playerName: toString(row.player_name),
    scoreboard: toString(row.scoreboard),
    runsScored: toInt(row.runs_scored),
    ballsFaced: toInt(row.balls_faced),
    fours: toInt(row.fours) ?? 0,
    sixes: toInt(row.sixes) ?? 0,
    strikeRate: toNumber(row.strike_rate),
    fowScore: toInt(row.fow_score),
    fowBalls: toNumber(row.fow_balls),
    isActive: toBool(row.is_active),
  };
}

/**
 * Batting scorecard entries for a fixture.
 * @param fixtureId - `matches.fixtures.sportmonks_id`
 */
export async function getFixtureBatting(
  fixtureId: SportmonksId,
): Promise<BattingEntry[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT fb.sportmonks_id, fb.fixture_id, fb.team_id, fb.player_id,
            p.fullname AS player_name, fb.scoreboard, fb.runs_scored, fb.balls_faced,
            fb.fours, fb.sixes, fb.strike_rate, fb.fow_score, fb.fow_balls, fb.is_active
     FROM matches.fixture_batting fb
     LEFT JOIN master.players p ON p.sportmonks_id = fb.player_id
     WHERE fb.fixture_id = $1
     ORDER BY fb.sort_order NULLS LAST, fb.runs_scored DESC NULLS LAST`,
    [fixtureId],
  );
  return rows.map(mapBattingEntry);
}

/**
 * Batting history for a player across fixtures, optionally scoped to a league.
 * @param playerId - `master.players.sportmonks_id`
 * @param leagueId - Optional `master.leagues.sportmonks_id` filter
 */
export async function getPlayerBattingHistory(
  playerId: SportmonksId,
  leagueId?: SportmonksId,
): Promise<BattingEntry[]> {
  const pool = await getReadPool();
  const params: unknown[] = [playerId];
  let leagueJoin = '';
  let leagueFilter = '';

  if (leagueId !== undefined) {
    leagueJoin = 'JOIN matches.fixtures f ON f.sportmonks_id = fb.fixture_id';
    leagueFilter = ' AND f.league_id = $2';
    params.push(leagueId);
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT fb.sportmonks_id, fb.fixture_id, fb.team_id, fb.player_id,
            p.fullname AS player_name, fb.scoreboard, fb.runs_scored, fb.balls_faced,
            fb.fours, fb.sixes, fb.strike_rate, fb.fow_score, fb.fow_balls, fb.is_active
     FROM matches.fixture_batting fb
     LEFT JOIN master.players p ON p.sportmonks_id = fb.player_id
     ${leagueJoin}
     WHERE fb.player_id = $1${leagueFilter}
     ORDER BY fb.fixture_id DESC`,
    params,
  );
  return rows.map(mapBattingEntry);
}
