import {
  getFixturesByLeague,
  getFixturesByTeam,
  getReadPool,
} from '@cricket-ai/database';
import {
  optionalLimit,
  optionalQuery,
  optionalSportmonksId,
} from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = optionalSportmonksId(searchParams, 'league');
  const seasonId = optionalSportmonksId(searchParams, 'season');
  const teamId = optionalSportmonksId(searchParams, 'team');
  const status = optionalQuery(searchParams, 'status');
  const limit = optionalLimit(searchParams, 20, 100);

  if (leagueId === undefined && teamId === undefined) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: league or team is required');
      },
      { cacheProfile: 'fixtures' },
    );
  }

  return withCricketHandler(
    async () => {
      let fixtures =
        teamId !== undefined
          ? await getFixturesByTeam(teamId, {
              leagueId,
              seasonId,
              status,
              limit,
            })
          : seasonId !== undefined
            ? await getFixturesByLeague(leagueId!, seasonId, status)
            : await fetchFixturesByLeagueOnly(leagueId!, status, limit);

      if (leagueId !== undefined && seasonId === undefined && teamId === undefined) {
        fixtures = fixtures.slice(0, limit);
      } else if (seasonId !== undefined && teamId === undefined) {
        fixtures = fixtures.slice(0, limit);
      }

      return { fixtures, count: fixtures.length };
    },
    { cacheProfile: 'fixtures' },
  );
}

async function fetchFixturesByLeagueOnly(
  leagueId: number,
  status: string | undefined,
  limit: number,
) {
  const pool = await getReadPool();
  const params: unknown[] = [leagueId];
  let statusClause = '';

  if (status !== undefined) {
    params.push(status);
    statusClause = ` AND f.status = $${params.length}`;
  }

  params.push(limit);

  const { rows } = await pool.query(
    `SELECT f.sportmonks_id, f.uuid, f.league_id, f.season_id, f.stage_id, f.round,
            f.localteam_id, f.visitorteam_id, lt.name AS localteam_name,
            vt.name AS visitorteam_name, f.starting_at, f.match_format, f.is_live,
            f.status, f.venue_id, f.winner_team_id, f.toss_won_team_id, f.note
     FROM matches.fixtures f
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     WHERE f.league_id = $1 AND f.is_active = true${statusClause}
     ORDER BY f.starting_at DESC NULLS LAST
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((row) => ({
    sportmonksId: Number(row.sportmonks_id),
    uuid: String(row.uuid),
    leagueId: Number(row.league_id),
    seasonId: Number(row.season_id),
    stageId: row.stage_id ? Number(row.stage_id) : null,
    round: row.round ? String(row.round) : null,
    localteamId: Number(row.localteam_id),
    visitorteamId: Number(row.visitorteam_id),
    localteamName: row.localteam_name ? String(row.localteam_name) : null,
    visitorteamName: row.visitorteam_name ? String(row.visitorteam_name) : null,
    startingAt: row.starting_at ? String(row.starting_at) : null,
    matchFormat: row.match_format ? String(row.match_format) : null,
    isLive: row.is_live === true,
    status: row.status ? String(row.status) : null,
    venueId: row.venue_id ? Number(row.venue_id) : null,
    winnerTeamId: row.winner_team_id ? Number(row.winner_team_id) : null,
    tossWonTeamId: row.toss_won_team_id ? Number(row.toss_won_team_id) : null,
    note: row.note ? String(row.note) : null,
  }));
}

export function POST() {
  return methodNotAllowed();
}
