import { getReadPool } from '../client.js';
import type { BowlingEntry, SportmonksId } from '../types/cricket.js';
import { toBool, toInt, toNumber, toString } from '../types/cricket.js';

function mapBowlingEntry(row: Record<string, unknown>): BowlingEntry {
  return {
    sportmonksId: toInt(row.sportmonks_id)!,
    fixtureId: toInt(row.fixture_id)!,
    teamId: toInt(row.team_id)!,
    playerId: toInt(row.player_id)!,
    playerName: toString(row.player_name),
    scoreboard: toString(row.scoreboard),
    overs: toNumber(row.overs),
    maidens: toInt(row.maidens) ?? 0,
    runsConceded: toInt(row.runs_conceded) ?? 0,
    wickets: toInt(row.wickets) ?? 0,
    wides: toInt(row.wides) ?? 0,
    noballs: toInt(row.noballs) ?? 0,
    economyRate: toNumber(row.economy_rate),
    isActive: toBool(row.is_active),
  };
}

/**
 * Bowling figures for a fixture.
 * @param fixtureId - `matches.fixtures.sportmonks_id`
 */
export async function getFixtureBowling(
  fixtureId: SportmonksId,
): Promise<BowlingEntry[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT fb.sportmonks_id, fb.fixture_id, fb.team_id, fb.player_id,
            p.fullname AS player_name, fb.scoreboard, fb.overs, fb.maidens,
            fb.runs_conceded, fb.wickets, fb.wides, fb.noballs, fb.economy_rate, fb.is_active
     FROM matches.fixture_bowling fb
     LEFT JOIN master.players p ON p.sportmonks_id = fb.player_id
     WHERE fb.fixture_id = $1
     ORDER BY fb.sort_order NULLS LAST, fb.wickets DESC NULLS LAST`,
    [fixtureId],
  );
  return rows.map(mapBowlingEntry);
}

/**
 * Bowling history for a player across fixtures, optionally scoped to a league.
 * @param playerId - `master.players.sportmonks_id`
 * @param leagueId - Optional `master.leagues.sportmonks_id` filter
 */
export async function getPlayerBowlingHistory(
  playerId: SportmonksId,
  leagueId?: SportmonksId,
): Promise<BowlingEntry[]> {
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
            p.fullname AS player_name, fb.scoreboard, fb.overs, fb.maidens,
            fb.runs_conceded, fb.wickets, fb.wides, fb.noballs, fb.economy_rate, fb.is_active
     FROM matches.fixture_bowling fb
     LEFT JOIN master.players p ON p.sportmonks_id = fb.player_id
     ${leagueJoin}
     WHERE fb.player_id = $1${leagueFilter}
     ORDER BY fb.fixture_id DESC`,
    params,
  );
  return rows.map(mapBowlingEntry);
}
