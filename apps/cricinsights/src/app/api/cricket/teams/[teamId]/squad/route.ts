import { getTeamById, getTeamSquad } from '@cricket-ai/database';
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
  params: Promise<{ teamId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { teamId } = await parseDynamicParams(context.params);
  const id = parseRouteId(teamId, 'teamId');
  const { searchParams } = new URL(request.url);
  const seasonId = optionalSportmonksId(searchParams, 'season');

  if (seasonId === undefined) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: season is required');
      },
      { cacheProfile: 'entity' },
    );
  }

  return withCricketHandler(
    async () => {
      const team = await getTeamById(id);
      if (!team) {
        return null;
      }

      const squad = await getTeamSquad(id, seasonId);
      return { team, seasonId, squad };
    },
    { cacheProfile: 'entity', notFoundMessage: `Team ${id} not found` },
  );
}

export function POST() {
  return methodNotAllowed();
}
