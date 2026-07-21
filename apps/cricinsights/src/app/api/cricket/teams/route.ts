import { getReadPool } from '@cricket-ai/database';
import { optionalSportmonksId } from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = optionalSportmonksId(searchParams, 'league');

  if (leagueId === undefined) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: league is required');
      },
      { cacheProfile: 'entity' },
    );
  }

  return withCricketHandler(
    async () => {
      const pool = await getReadPool();
      const { rows } = await pool.query<{
        sportmonks_id: string;
        uuid: string;
        name: string;
        code: string | null;
        country_id: string | null;
        image_path: string | null;
        national_team: boolean;
        is_active: boolean;
      }>(
        `SELECT DISTINCT t.sportmonks_id, t.uuid, t.name, t.code, t.country_id,
                t.image_path, t.national_team, t.is_active
         FROM master.teams t
         JOIN master.standings st ON st.team_id = t.sportmonks_id
         WHERE st.league_id = $1 AND t.is_active = true
         ORDER BY t.name`,
        [leagueId],
      );

      return {
        leagueId,
        teams: rows.map((row) => ({
          sportmonksId: Number(row.sportmonks_id),
          uuid: row.uuid,
          name: row.name,
          code: row.code,
          countryId: row.country_id ? Number(row.country_id) : null,
          imagePath: row.image_path,
          nationalTeam: row.national_team,
          isActive: row.is_active,
        })),
        count: rows.length,
      };
    },
    { cacheProfile: 'entity' },
  );
}

export function POST() {
  return methodNotAllowed();
}
