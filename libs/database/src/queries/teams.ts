import { getReadPool } from '../client.js';
import type {
  Player,
  SquadMember,
  SportmonksId,
  Team,
  TeamFormResult,
} from '../types/cricket.js';
import { toBool, toInt, toString } from '../types/cricket.js';

function mapTeam(row: Record<string, unknown>): Team {
  return {
    sportmonksId: toInt(row.sportmonks_id)!,
    uuid: String(row.uuid),
    name: String(row.name),
    code: toString(row.code),
    countryId: toInt(row.country_id),
    imagePath: toString(row.image_path),
    nationalTeam: toBool(row.national_team),
    isActive: toBool(row.is_active),
  };
}

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

function mapFormResult(row: Record<string, unknown>): TeamFormResult {
  const teamId = toInt(row.team_id)!;
  const localId = toInt(row.localteam_id)!;
  const visitorId = toInt(row.visitorteam_id)!;
  const winnerId = toInt(row.winner_team_id);
  const isLocal = teamId === localId;
  const opponentId = isLocal ? visitorId : localId;

  let result: TeamFormResult['result'] = 'unknown';
  if (winnerId === teamId) result = 'win';
  else if (winnerId !== null && winnerId !== teamId) result = 'loss';
  else if (row.draw_noresult) result = 'draw';

  return {
    fixtureId: toInt(row.sportmonks_id)!,
    startingAt: row.starting_at ? String(row.starting_at) : null,
    opponentId,
    opponentName: String(row.opponent_name),
    result,
    margin: toString(row.note),
  };
}

/**
 * Fuzzy team search by name or code (IPL franchise names, abbreviations).
 */
export async function searchTeams(query: string, limit = 12): Promise<Team[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const pool = await getReadPool();
  const pattern = `%${trimmed.replace(/\s+/g, '%')}%`;
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT sportmonks_id, uuid, name, code, country_id, image_path, national_team, is_active
     FROM master.teams
     WHERE is_active = true
       AND (
         name ILIKE $1
         OR code ILIKE $1
         OR name ILIKE $2
       )
     ORDER BY
       CASE WHEN lower(name) = lower($3) THEN 0
            WHEN lower(code) = lower($3) THEN 1
            ELSE 2 END,
       length(name)
     LIMIT $4`,
    [pattern, `%${trimmed}%`, trimmed, limit],
  );
  return rows.map(mapTeam);
}

/** Resolve a team name to a single franchise / team record. */
export async function resolveTeamByName(name: string): Promise<Team> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Team name is required');
  }
  const matches = await searchTeams(trimmed);
  if (matches.length === 0) {
    throw new Error(`No team found matching "${trimmed}"`);
  }
  if (matches.length === 1) {
    return matches[0];
  }
  const exact = matches.find(
    (team) =>
      team.name.toLowerCase() === trimmed.toLowerCase() ||
      (team.code?.toLowerCase() ?? '') === trimmed.toLowerCase(),
  );
  return exact ?? matches[0];
}

/**
 * Fetch a team by SportMonks ID.
 * @param id - `master.teams.sportmonks_id`
 */
export async function getTeamById(id: SportmonksId): Promise<Team | null> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT sportmonks_id, uuid, name, code, country_id, image_path, national_team, is_active
     FROM master.teams
     WHERE sportmonks_id = $1`,
    [id],
  );
  return rows[0] ? mapTeam(rows[0]) : null;
}

/**
 * Squad roster for a team in a given season.
 * @param teamId - `master.teams.sportmonks_id`
 * @param seasonId - `master.seasons.sportmonks_id`
 */
export async function getTeamSquad(
  teamId: SportmonksId,
  seasonId: SportmonksId,
): Promise<SquadMember[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT tsm.team_id, tsm.player_id, tsm.season_id,
            p.sportmonks_id, p.uuid, p.firstname, p.lastname, p.fullname,
            p.country_id, p.position_id, p.image_path, p.dateofbirth,
            p.gender, p.battingstyle, p.bowlingstyle, p.is_active
     FROM master.team_squad_members tsm
     JOIN master.players p ON p.sportmonks_id = tsm.player_id
     WHERE tsm.team_id = $1 AND tsm.season_id = $2
     ORDER BY p.fullname`,
    [teamId, seasonId],
  );

  return rows.map((row) => ({
    teamId: toInt(row.team_id)!,
    playerId: toInt(row.player_id)!,
    seasonId: toInt(row.season_id)!,
    player: mapPlayer(row),
  }));
}

/**
 * Recent match results for a team derived from completed fixtures.
 * @param teamId - `master.teams.sportmonks_id`
 * @param limit - Max fixtures to return (default 5)
 */
export async function getTeamRecentForm(
  teamId: SportmonksId,
  limit = 5,
): Promise<TeamFormResult[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT f.sportmonks_id, f.starting_at, f.localteam_id, f.visitorteam_id,
            f.winner_team_id, f.draw_noresult, f.note, $1::bigint AS team_id,
            CASE
              WHEN f.localteam_id = $1 THEN vt.name
              ELSE lt.name
            END AS opponent_name
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     WHERE (f.localteam_id = $1 OR f.visitorteam_id = $1)
       AND f.is_active = true
     ORDER BY f.starting_at DESC NULLS LAST
     LIMIT $2`,
    [teamId, limit],
  );
  return rows.map(mapFormResult);
}
