import { getStandings } from '@cricket-ai/database';
import {
  optionalSportmonksId,
  parseDynamicParams,
  parseRouteId,
} from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

interface RouteContext {
  params: Promise<{ leagueId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { leagueId: leagueParam } = await parseDynamicParams(context.params);
  const leagueId = parseRouteId(leagueParam, 'leagueId');
  const { searchParams } = new URL(request.url);
  const seasonId = optionalSportmonksId(searchParams, 'season');

  if (seasonId === undefined) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: season is required');
      },
      { cacheProfile: 'standings' },
    );
  }

  return withCricketHandler(
    async () => {
      const standings = await getStandings(leagueId, seasonId);
      return { leagueId, seasonId, standings };
    },
    { cacheProfile: 'standings' },
  );
}

export function POST() {
  return methodNotAllowed();
}
