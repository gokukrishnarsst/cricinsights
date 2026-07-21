import { getPlayerById, getPlayerCareerStats } from '@cricket-ai/database';
import {
  optionalQuery,
  optionalSportmonksId,
  parseDynamicParams,
  parseRouteId,
} from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

interface RouteContext {
  params: Promise<{ playerId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { playerId } = await parseDynamicParams(context.params);
  const id = parseRouteId(playerId, 'playerId');
  const { searchParams } = new URL(request.url);
  const formatType = optionalQuery(searchParams, 'format');
  const leagueId = optionalSportmonksId(searchParams, 'league');
  const seasonId = optionalSportmonksId(searchParams, 'season');

  return withCricketHandler(
    async () => {
      const player = await getPlayerById(id);
      if (!player) {
        return null;
      }

      let careerStats = await getPlayerCareerStats(id, formatType, leagueId);

      if (seasonId !== undefined) {
        careerStats = careerStats.filter((stat) => stat.seasonId === seasonId);
      }

      return {
        player,
        careerStats,
        filters: {
          format: formatType ?? null,
          leagueId: leagueId ?? null,
          seasonId: seasonId ?? null,
        },
      };
    },
    { cacheProfile: 'entity', notFoundMessage: `Player ${id} not found` },
  );
}

export function POST() {
  return methodNotAllowed();
}
