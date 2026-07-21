import { getPlayerById } from '@cricket-ai/database';
import { parseDynamicParams, parseRouteId } from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

interface RouteContext {
  params: Promise<{ playerId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { playerId } = await parseDynamicParams(context.params);
  const id = parseRouteId(playerId, 'playerId');

  return withCricketHandler(
    async () => {
      const player = await getPlayerById(id);
      return player ? { player } : null;
    },
    { cacheProfile: 'entity', notFoundMessage: `Player ${id} not found` },
  );
}

export function POST() {
  return methodNotAllowed();
}
