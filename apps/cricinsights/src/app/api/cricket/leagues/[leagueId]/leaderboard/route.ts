import { getLeaderboard } from '@cricket-ai/database';
import {
  mapLeaderboardMetric,
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
  params: Promise<{ leagueId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { leagueId: leagueParam } = await parseDynamicParams(context.params);
  const leagueId = parseRouteId(leagueParam, 'leagueId');
  const { searchParams } = new URL(request.url);
  const seasonId = optionalSportmonksId(searchParams, 'season');
  const metricRaw = optionalQuery(searchParams, 'metric') ?? 'runs';

  if (seasonId === undefined) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: season is required');
      },
      { cacheProfile: 'standings' },
    );
  }

  const metric = mapLeaderboardMetric(metricRaw);

  return withCricketHandler(
    async () => {
      const entries = await getLeaderboard(leagueId, seasonId, metric);
      return { leagueId, seasonId, metric, entries };
    },
    { cacheProfile: 'standings' },
  );
}

export function POST() {
  return methodNotAllowed();
}
