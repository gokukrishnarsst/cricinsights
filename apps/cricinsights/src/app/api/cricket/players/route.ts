import { searchPlayers } from '@cricket-ai/database';
import {
  optionalLimit,
  optionalQuery,
} from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = optionalQuery(searchParams, 'q');

  if (!q) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: q is required');
      },
      { cacheProfile: 'entity' },
    );
  }

  const limit = optionalLimit(searchParams, 10, 50);

  return withCricketHandler(
    async () => {
      const players = await searchPlayers(q);
      return { players: players.slice(0, limit), count: Math.min(players.length, limit) };
    },
    { cacheProfile: 'entity' },
  );
}

export function POST() {
  return methodNotAllowed();
}
