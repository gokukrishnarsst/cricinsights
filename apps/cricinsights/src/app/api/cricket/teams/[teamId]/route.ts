import { getTeamById } from '@cricket-ai/database';
import { parseDynamicParams, parseRouteId } from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

interface RouteContext {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { teamId } = await parseDynamicParams(context.params);
  const id = parseRouteId(teamId, 'teamId');

  return withCricketHandler(
    async () => {
      const team = await getTeamById(id);
      return team ? { team } : null;
    },
    { cacheProfile: 'entity', notFoundMessage: `Team ${id} not found` },
  );
}

export function POST() {
  return methodNotAllowed();
}
