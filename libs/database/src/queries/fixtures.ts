import { getReadPool } from '../client.js';
import type { Fixture, FixtureQueryOptions, SportmonksId } from '../types/cricket.js';
import { toBool, toInt, toString } from '../types/cricket.js';

const FIXTURE_SELECT = `
  f.sportmonks_id, f.uuid, f.league_id, f.season_id, f.stage_id, f.round,
  f.localteam_id, f.visitorteam_id, lt.name AS localteam_name, vt.name AS visitorteam_name,
  f.starting_at, f.match_format, f.is_live, f.status, f.venue_id,
  f.winner_team_id, f.toss_won_team_id, f.note
`;

function mapFixture(row: Record<string, unknown>): Fixture {
  return {
    sportmonksId: toInt(row.sportmonks_id)!,
    uuid: String(row.uuid),
    leagueId: toInt(row.league_id)!,
    seasonId: toInt(row.season_id)!,
    stageId: toInt(row.stage_id),
    round: toString(row.round),
    localteamId: toInt(row.localteam_id)!,
    visitorteamId: toInt(row.visitorteam_id)!,
    localteamName: toString(row.localteam_name),
    visitorteamName: toString(row.visitorteam_name),
    startingAt: row.starting_at ? String(row.starting_at) : null,
    matchFormat: toString(row.match_format),
    isLive: toBool(row.is_live),
    status: toString(row.status),
    venueId: toInt(row.venue_id),
    winnerTeamId: toInt(row.winner_team_id),
    tossWonTeamId: toInt(row.toss_won_team_id),
    note: toString(row.note),
  };
}

/**
 * Fetch a single fixture by SportMonks ID.
 * @param id - `matches.fixtures.sportmonks_id`
 */
export async function getFixtureById(id: SportmonksId): Promise<Fixture | null> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ${FIXTURE_SELECT}
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     WHERE f.sportmonks_id = $1`,
    [id],
  );
  return rows[0] ? mapFixture(rows[0]) : null;
}

/**
 * List fixtures involving a team with optional filters.
 * @param teamId - `master.teams.sportmonks_id`
 * @param options - Optional season, league, status, pagination
 */
export async function getFixturesByTeam(
  teamId: SportmonksId,
  options: FixtureQueryOptions = {},
): Promise<Fixture[]> {
  const pool = await getReadPool();
  const params: unknown[] = [teamId];
  const conditions = ['(f.localteam_id = $1 OR f.visitorteam_id = $1)', 'f.is_active = true'];

  if (options.seasonId !== undefined) {
    params.push(options.seasonId);
    conditions.push(`f.season_id = $${params.length}`);
  }
  if (options.leagueId !== undefined) {
    params.push(options.leagueId);
    conditions.push(`f.league_id = $${params.length}`);
  }
  if (options.status !== undefined) {
    params.push(options.status);
    conditions.push(`f.status = $${params.length}`);
  }

  const limit = options.limit ?? 50;
  params.push(limit);
  const limitParam = `$${params.length}`;

  let offsetClause = '';
  if (options.offset !== undefined) {
    params.push(options.offset);
    offsetClause = ` OFFSET $${params.length}`;
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ${FIXTURE_SELECT}
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.starting_at DESC NULLS LAST
     LIMIT ${limitParam}${offsetClause}`,
    params,
  );
  return rows.map(mapFixture);
}

/**
 * Fixtures for a league and season, optionally filtered by status.
 * @param leagueId - `master.leagues.sportmonks_id`
 * @param seasonId - `master.seasons.sportmonks_id`
 * @param status - Optional fixture status filter
 */
export async function getFixturesByLeague(
  leagueId: SportmonksId,
  seasonId: SportmonksId,
  status?: string,
): Promise<Fixture[]> {
  const pool = await getReadPool();
  const params: unknown[] = [leagueId, seasonId];
  let statusClause = '';
  if (status !== undefined) {
    params.push(status);
    statusClause = ` AND f.status = $${params.length}`;
  }

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ${FIXTURE_SELECT}
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     WHERE f.league_id = $1 AND f.season_id = $2 AND f.is_active = true${statusClause}
     ORDER BY f.starting_at ASC NULLS LAST`,
    params,
  );
  return rows.map(mapFixture);
}

/**
 * Return the completed final and winning team for a league season.
 *
 * This deliberately queries only the final instead of loading a whole season's
 * fixtures when the caller only needs the tournament winner.
 */
export async function getSeasonWinner(
  leagueId: SportmonksId,
  seasonId: SportmonksId,
): Promise<{ fixture: Fixture; winnerName: string } | null> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ${FIXTURE_SELECT}, wt.name AS winner_team_name
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     JOIN master.teams wt ON wt.sportmonks_id = f.winner_team_id
     WHERE f.league_id = $1
       AND f.season_id = $2
       AND f.is_active = true
       AND f.winner_team_id IS NOT NULL
       AND LOWER(COALESCE(f.round, '')) ~ '(^|[^a-z])final([^a-z]|$)'
     ORDER BY
       CASE WHEN LOWER(COALESCE(f.round, '')) = 'final' THEN 0 ELSE 1 END,
       f.starting_at DESC NULLS LAST
     LIMIT 1`,
    [leagueId, seasonId],
  );

  const row = rows[0];
  if (!row) return null;
  return { fixture: mapFixture(row), winnerName: String(row.winner_team_name) };
}

/**
 * Head-to-head fixtures between two teams (both home/away directions).
 * @param teamAId - First team `sportmonks_id`
 * @param teamBId - Second team `sportmonks_id`
 * @param limit - Max fixtures (default 20)
 */
export async function getHeadToHead(
  teamAId: SportmonksId,
  teamBId: SportmonksId,
  limit = 20,
): Promise<Fixture[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ${FIXTURE_SELECT}
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     WHERE (
       (f.localteam_id = $1 AND f.visitorteam_id = $2)
       OR (f.localteam_id = $2 AND f.visitorteam_id = $1)
     )
     AND f.is_active = true
     ORDER BY f.starting_at DESC NULLS LAST
     LIMIT $3`,
    [teamAId, teamBId, limit],
  );
  return rows.map(mapFixture);
}

export interface FixtureContextQueryOptions {
  /** Calendar year from `starting_at`, for example 2024. */
  year?: number;
  /** Case-insensitive partial match against `matches.fixtures.match_format`. */
  matchFormat?: string;
  /** Case-insensitive partial match against the competition name. */
  leagueName?: string;
  /** Bounded number of candidate fixtures to return. */
  limit?: number;
}

/**
 * Find a fixture between two teams using the human context users naturally
 * provide (year, format, and competition), without requiring a fixture ID.
 */
export async function findFixturesByTeams(
  teamAId: SportmonksId,
  teamBId: SportmonksId,
  options: FixtureContextQueryOptions = {},
): Promise<Fixture[]> {
  const pool = await getReadPool();
  const params: unknown[] = [teamAId, teamBId];
  const conditions = [
    '((f.localteam_id = $1 AND f.visitorteam_id = $2) OR (f.localteam_id = $2 AND f.visitorteam_id = $1))',
    'f.is_active = true',
  ];

  if (options.year !== undefined) {
    params.push(options.year);
    conditions.push(`EXTRACT(YEAR FROM f.starting_at) = $${params.length}`);
  }
  if (options.matchFormat?.trim()) {
    params.push(`%${options.matchFormat.trim()}%`);
    conditions.push(`COALESCE(f.match_format, '') ILIKE $${params.length}`);
  }
  if (options.leagueName?.trim()) {
    params.push(`%${options.leagueName.trim()}%`);
    conditions.push(`l.name ILIKE $${params.length}`);
  }

  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  params.push(limit);
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ${FIXTURE_SELECT}
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     JOIN master.leagues l ON l.sportmonks_id = f.league_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.starting_at DESC NULLS LAST
     LIMIT $${params.length}`,
    params,
  );
  return rows.map(mapFixture);
}
