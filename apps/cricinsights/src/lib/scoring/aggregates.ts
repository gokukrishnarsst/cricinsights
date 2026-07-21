import type { CareerStats } from '@cricket-ai/database';
import type { PlayerAggregates } from '@/types/cricket';

function estimatePhaseSplits(runs: number, balls: number) {
  return {
    powerplayRuns: Math.round(runs * 0.28),
    powerplayBalls: Math.round(balls * 0.26),
    deathRuns: Math.round(runs * 0.22),
    deathBalls: Math.round(balls * 0.14),
    middleRuns: Math.round(runs * 0.5),
    middleBalls: Math.round(balls * 0.6),
  };
}

/**
 * Sum career stat rows into rating aggregates, preferring T20 rows when present.
 */
export function careerStatsToAggregates(
  rows: CareerStats[],
  leagueId?: number,
): PlayerAggregates | null {
  let filtered = leagueId
    ? rows.filter((row) => row.leagueId === leagueId)
    : rows;
  if (filtered.length === 0) {
    filtered = rows;
  }
  if (filtered.length === 0) {
    return null;
  }

  const t20 = filtered.filter((row) =>
    row.formatType.toLowerCase().includes('t20'),
  );
  const use = t20.length > 0 ? t20 : filtered;

  let matches = 0;
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let wickets = 0;
  let overs = 0;
  let economySum = 0;
  let economyCount = 0;
  let bowlingAverageSum = 0;
  let bowlingAverageCount = 0;
  let averageSum = 0;
  let averageCount = 0;

  for (const row of use) {
    matches += row.battingMatches ?? row.bowlingMatches ?? 0;
    runs += row.battingRuns ?? 0;
    fours += row.battingFours ?? 0;
    sixes += row.battingSixes ?? 0;
    wickets += row.bowlingWickets ?? 0;
    overs += row.bowlingOvers ?? 0;

    if (row.battingInnings && row.battingRuns) {
      const inferredBalls = row.battingStrikeRate
        ? (row.battingRuns / row.battingStrikeRate) * 100
        : row.battingInnings * 20;
      balls += Math.round(inferredBalls);
    }

    if (row.battingAverage != null) {
      averageSum += row.battingAverage;
      averageCount += 1;
    }
    if (row.bowlingEconomyRate != null) {
      economySum += row.bowlingEconomyRate;
      economyCount += 1;
    }
    if (row.bowlingAverage != null) {
      bowlingAverageSum += row.bowlingAverage;
      bowlingAverageCount += 1;
    }
  }

  if (matches === 0 && runs === 0 && wickets === 0) {
    return null;
  }

  const strikeRate = balls > 0 ? (runs / balls) * 100 : 0;
  const average = averageCount > 0 ? averageSum / averageCount : 0;
  const economy = economyCount > 0 ? economySum / economyCount : 0;
  const bowlingAverage =
    bowlingAverageCount > 0 ? bowlingAverageSum / bowlingAverageCount : 0;

  const phases = estimatePhaseSplits(runs, balls || 1);

  return {
    matches,
    runs,
    balls,
    strikeRate,
    average,
    fours,
    sixes,
    wickets,
    overs,
    economy,
    bowlingAverage,
    ...phases,
  };
}
