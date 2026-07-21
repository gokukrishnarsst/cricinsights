import { getReadPool } from '../client.js';
import type { CareerStats, Player, SportmonksId } from '../types/cricket.js';
import { toBool, toInt, toNumber, toString } from '../types/cricket.js';

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    sportmonksId: toInt(row.sportmonks_id)!,
    uuid: String(row.uuid),
    firstname: toString(row.firstname),
    lastname: toString(row.lastname),
    fullname: String(row.fullname),
    countryId: toInt(row.country_id),
    positionId: toInt(row.position_id),
    imagePath: toString(row.image_path),
    dateofbirth: row.dateofbirth ? String(row.dateofbirth) : null,
    gender: toString(row.gender),
    battingstyle: toString(row.battingstyle),
    bowlingstyle: toString(row.bowlingstyle),
    isActive: toBool(row.is_active),
  };
}

function mapCareerStats(row: Record<string, unknown>): CareerStats {
  return {
    playerId: toInt(row.player_id)!,
    seasonId: toInt(row.season_id)!,
    seasonName: String(row.season_name),
    leagueId: toInt(row.league_id)!,
    leagueName: String(row.league_name),
    formatType: String(row.format_type),
    battingMatches: toInt(row.batting_matches),
    battingInnings: toInt(row.batting_innings),
    battingRuns: toInt(row.batting_runs),
    battingAverage: toNumber(row.batting_average),
    battingStrikeRate: toNumber(row.batting_strike_rate),
    battingFours: toInt(row.batting_fours),
    battingSixes: toInt(row.batting_sixes),
    battingFifties: toInt(row.batting_fifties),
    battingHundreds: toInt(row.batting_hundreds),
    bowlingMatches: toInt(row.bowling_matches),
    bowlingOvers: toNumber(row.bowling_overs),
    bowlingWickets: toInt(row.bowling_wickets),
    bowlingAverage: toNumber(row.bowling_average),
    bowlingEconomyRate: toNumber(row.bowling_economy_rate),
    bowlingStrikeRate: toNumber(row.bowling_strike_rate),
  };
}

/**
 * Fuzzy search for players by full name (case-insensitive).
 * @param name - Partial or full name to match against `master.players.fullname`
 */
export async function searchPlayers(name: string): Promise<Player[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT sportmonks_id, uuid, firstname, lastname, fullname, country_id, position_id,
            image_path, dateofbirth, gender, battingstyle, bowlingstyle, is_active
     FROM master.players
     WHERE fullname ILIKE $1 AND is_active = true
     ORDER BY fullname
     LIMIT 50`,
    [`%${name}%`],
  );
  return rows.map(mapPlayer);
}

/**
 * Resolve a player name to a single record, preferring exact matches and
 * highest career impact when multiple fuzzy matches exist.
 */
export async function resolvePlayerByName(name: string): Promise<Player> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Player name is required');
  }

  const matches = await searchPlayers(trimmed);
  if (matches.length === 0) {
    throw new Error(`No player found matching "${trimmed}"`);
  }

  if (matches.length === 1) {
    return matches[0];
  }

  const exact = matches.find(
    (player) => player.fullname.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) {
    return exact;
  }

  let best = matches[0];
  let bestScore = -1;
  const candidates = matches.slice(0, 8);

  for (const player of candidates) {
    const stats = await getPlayerCareerStats(player.sportmonksId);
    const score = stats.reduce(
      (sum, row) => sum + (row.battingRuns ?? 0) + (row.bowlingWickets ?? 0) * 25,
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = player;
    }
  }

  return best;
}

/**
 * Fetch a single player by SportMonks ID.
 * @param id - `master.players.sportmonks_id`
 */
export async function getPlayerById(id: SportmonksId): Promise<Player | null> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT sportmonks_id, uuid, firstname, lastname, fullname, country_id, position_id,
            image_path, dateofbirth, gender, battingstyle, bowlingstyle, is_active
     FROM master.players
     WHERE sportmonks_id = $1`,
    [id],
  );
  return rows[0] ? mapPlayer(rows[0]) : null;
}

/**
 * Career statistics for a player, optionally filtered by format and league.
 * Joins through `master.seasons` to resolve league context.
 * @param playerId - `master.players.sportmonks_id`
 * @param formatType - Optional format filter (e.g. `odi`, `t20`, `test`)
 * @param leagueId - Optional `master.leagues.sportmonks_id` filter
 */
export async function getPlayerCareerStats(
  playerId: SportmonksId,
  formatType?: string,
  leagueId?: SportmonksId,
): Promise<CareerStats[]> {
  const pool = await getReadPool();
  const params: unknown[] = [playerId];
  const conditions = ['pcs.player_id = $1'];

  if (formatType !== undefined) {
    params.push(formatType);
    conditions.push(`pcs.format_type = $${params.length}`);
  }
  if (leagueId !== undefined) {
    params.push(leagueId);
    conditions.push(`s.league_id = $${params.length}`);
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT pcs.player_id, pcs.season_id, s.name AS season_name,
            s.league_id, l.name AS league_name, pcs.format_type,
            pcs.batting_matches, pcs.batting_innings, pcs.batting_runs,
            pcs.batting_average, pcs.batting_strike_rate, pcs.batting_fours,
            pcs.batting_sixes, pcs.batting_fifties, pcs.batting_hundreds,
            pcs.bowling_matches, pcs.bowling_overs, pcs.bowling_wickets,
            pcs.bowling_average, pcs.bowling_economy_rate, pcs.bowling_strike_rate
     FROM master.player_career_stats pcs
     JOIN master.seasons s ON s.sportmonks_id = pcs.season_id
     JOIN master.leagues l ON l.sportmonks_id = s.league_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.name, pcs.format_type`,
    params,
  );
  return rows.map(mapCareerStats);
}
