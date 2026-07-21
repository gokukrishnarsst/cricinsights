import { getTeamById, getTeamRecentForm } from '@cricket-ai/database';
import {
  optionalLimit,
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
  const limit = optionalLimit(searchParams, 5, 20);

  return withCricketHandler(
    async () => {
      const team = await getTeamById(id);
      if (!team) {
        return null;
      }

      const form = await getTeamRecentForm(id, limit);
      return { team, form, limit };
    },
    { cacheProfile: 'entity', notFoundMessage: `Team ${id} not found` },
  );
}

export function POST() {
  return methodNotAllowed();
}
