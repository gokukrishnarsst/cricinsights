import { getFixtureById } from '@cricket-ai/database';
import { parseDynamicParams, parseRouteId } from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

interface RouteContext {
  params: Promise<{ fixtureId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { fixtureId } = await parseDynamicParams(context.params);
  const id = parseRouteId(fixtureId, 'fixtureId');

  return withCricketHandler(
    async () => {
      const fixture = await getFixtureById(id);
      return fixture ? { fixture } : null;
    },
    { cacheProfile: 'fixtures', notFoundMessage: `Fixture ${id} not found` },
  );
}

export function POST() {
  return methodNotAllowed();
}
