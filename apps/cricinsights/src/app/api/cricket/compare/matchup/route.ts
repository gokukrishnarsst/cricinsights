import {
  getPlayerById,
  getPlayerMatchup,
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
  const batsman = optionalQuery(searchParams, 'batsman');
  const bowler = optionalQuery(searchParams, 'bowler');
  const leagueId = optionalSportmonksId(searchParams, 'league');

  if (!batsman || !bowler) {
    return withCricketHandler(
      async () => {
        throw new Error('Invalid query parameter: batsman and bowler are required');
      },
      { cacheProfile: 'entity' },
    );
  }

  const batsmanId = parseSportmonksId(batsman, 'batsman');
  const bowlerId = parseSportmonksId(bowler, 'bowler');

  return withCricketHandler(
    async () => {
      const [batsmanProfile, bowlerProfile, matchup] = await Promise.all([
        getPlayerById(batsmanId),
        getPlayerById(bowlerId),
        getPlayerMatchup(batsmanId, bowlerId, leagueId),
      ]);

      if (!batsmanProfile || !bowlerProfile) {
        return null;
      }

      return {
        comparisonType: 'batsman_vs_bowler',
        batsman: { profile: batsmanProfile },
        bowler: { profile: bowlerProfile },
        matchup,
        diff: {
          strikeRate: {
            value: matchup.strikeRate,
            leader:
              matchup.strikeRate !== null && matchup.strikeRate >= 100
                ? 'batsman'
                : 'bowler',
          },
          dismissals: { value: matchup.dismissals, leader: 'bowler' },
        },
      };
    },
    {
      cacheProfile: 'entity',
      notFoundMessage: 'Batsman or bowler not found',
    },
  );
}

export function POST() {
  return methodNotAllowed();
}
