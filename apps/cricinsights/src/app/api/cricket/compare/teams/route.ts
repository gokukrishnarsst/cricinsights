import {
  getHeadToHead,
  getTeamById,
} from '@cricket-ai/database';
import {
  optionalLimit,
  optionalQuery,
  parseSportmonksId,
} from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamA = optionalQuery(searchParams, 'a');
  const teamB = optionalQuery(searchParams, 'b');
  const limit = optionalLimit(searchParams, 20, 50);

  if (!teamA || !teamB) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: a and b are required');
      },
      { cacheProfile: 'entity' },
    );
  }

  const idA = parseSportmonksId(teamA, 'a');
  const idB = parseSportmonksId(teamB, 'b');

  return withCricketHandler(
    async () => {
      const [profileA, profileB, headToHead] = await Promise.all([
        getTeamById(idA),
        getTeamById(idB),
        getHeadToHead(idA, idB, limit),
      ]);

      if (!profileA || !profileB) {
        return null;
      }

      const teamAWins = headToHead.filter(
        (fixture) => fixture.winnerTeamId === idA,
      ).length;
      const teamBWins = headToHead.filter(
        (fixture) => fixture.winnerTeamId === idB,
      ).length;

      return {
        comparisonType: 'team_vs_team',
        entityA: { profile: profileA },
        entityB: { profile: profileB },
        headToHead,
        diff: {
          teamAWins: diffHighlight(teamAWins, teamBWins),
          teamBWins: diffHighlight(teamBWins, teamAWins),
          matchesPlayed: headToHead.length,
        },
      };
    },
    {
      cacheProfile: 'entity',
      notFoundMessage: 'One or both teams not found',
    },
  );
}

function diffHighlight(a: number, b: number) {
  return {
    a,
    b,
    delta: a - b,
    leader: a === b ? 'tie' : a > b ? 'a' : 'b',
  };
}

export function POST() {
  return methodNotAllowed();
}
