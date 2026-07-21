import {
  getPlayerById,
  getPlayerCareerStats,
} from '@cricket-ai/database';
import {
  optionalQuery,
  optionalSportmonksId,
  parseSportmonksId,
} from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerA = optionalQuery(searchParams, 'a');
  const playerB = optionalQuery(searchParams, 'b');
  const formatType = optionalQuery(searchParams, 'format');
  const leagueId = optionalSportmonksId(searchParams, 'league');

  if (!playerA || !playerB) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: a and b are required');
      },
      { cacheProfile: 'entity' },
    );
  }

  const idA = parseSportmonksId(playerA, 'a');
  const idB = parseSportmonksId(playerB, 'b');

  return withCricketHandler(
    async () => {
      const [profileA, profileB] = await Promise.all([
        getPlayerById(idA),
        getPlayerById(idB),
      ]);

      if (!profileA || !profileB) {
        return null;
      }

      const [statsA, statsB] = await Promise.all([
        getPlayerCareerStats(idA, formatType, leagueId),
        getPlayerCareerStats(idB, formatType, leagueId),
      ]);

      const totalRunsA = statsA.reduce((sum, s) => sum + (s.battingRuns ?? 0), 0);
      const totalRunsB = statsB.reduce((sum, s) => sum + (s.battingRuns ?? 0), 0);
      const totalWicketsA = statsA.reduce(
        (sum, s) => sum + (s.bowlingWickets ?? 0),
        0,
      );
      const totalWicketsB = statsB.reduce(
        (sum, s) => sum + (s.bowlingWickets ?? 0),
        0,
      );

      return {
        comparisonType: 'player_vs_player',
        entityA: { profile: profileA, careerStats: statsA },
        entityB: { profile: profileB, careerStats: statsB },
        diff: {
          battingRuns: diffHighlight(totalRunsA, totalRunsB),
          bowlingWickets: diffHighlight(totalWicketsA, totalWicketsB),
        },
        filters: {
          format: formatType ?? null,
          leagueId: leagueId ?? null,
        },
      };
    },
    {
      cacheProfile: 'entity',
      notFoundMessage: 'One or both players not found',
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
