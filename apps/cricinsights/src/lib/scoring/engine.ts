import type {
  CardTier,
  CricketStats,
  LeagueCode,
  PlayerAggregates,
  PlayerProfile,
  PlayerRole,
  RatedPlayerCard,
  StatKey,
} from '@/types/cricket';

export const STAT_LABELS: Record<StatKey, string> = {
  bat: 'BAT',
  con: 'CON',
  pwr: 'PWR',
  dth: 'DTH',
  eco: 'ECO',
  wkt: 'WKT',
  clt: 'CLT',
};

const clamp = (n: number, min = 1, max = 99) =>
  Math.max(min, Math.min(max, Math.round(n)));

function norm(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return clamp(1 + ((value - min) / (max - min)) * 98);
}

export function detectRole(profile: PlayerProfile): PlayerRole {
  if (profile.role) return profile.role;
  const bat = profile.battingStyle && profile.battingStyle.length > 0;
  const bowl = profile.bowlingStyle && profile.bowlingStyle.length > 2;
  if (bat && bowl) return 'all-rounder';
  if (bowl) return 'bowler';
  if (profile.position === 'WK') return 'wicketkeeper';
  return 'batter';
}

export function computeStats(
  role: PlayerRole,
  agg: PlayerAggregates,
): CricketStats {
  const ppSr =
    agg.powerplayBalls > 0
      ? (agg.powerplayRuns / agg.powerplayBalls) * 100
      : agg.strikeRate;
  const deathSr =
    agg.deathBalls > 0 ? (agg.deathRuns / agg.deathBalls) * 100 : agg.strikeRate;
  const deathEcon =
    agg.deathBalls > 0
      ? (agg.deathRuns / agg.deathBalls) * 6
      : agg.economy || 10;

  const batting = {
    bat: norm(agg.strikeRate, 115, 175),
    con: norm(agg.average, 18, 45),
    pwr: norm(ppSr, 100, 180),
    dth: norm(deathSr, 110, 220),
    eco: norm(12 - (agg.economy || 12), 0, 6),
    wkt: norm(agg.wickets, 0, 150),
    clt: norm(agg.deathRuns, 0, 800),
  };

  const bowling = {
    bat: norm(agg.strikeRate, 100, 160),
    con: norm(agg.matches, 10, 120),
    pwr: norm(8 - (agg.economy || 8), 0, 4),
    dth: norm(12 - deathEcon, 0, 6),
    eco: norm(12 - (agg.economy || 12), 0, 6),
    wkt: norm(agg.wickets, 0, 150),
    clt: norm(agg.bowlingAverage > 0 ? 40 - agg.bowlingAverage : 0, -5, 25),
  };

  if (role === 'bowler') return bowling;
  if (role === 'batter' || role === 'wicketkeeper') return batting;

  return {
    bat: clamp((batting.bat + bowling.bat) / 2),
    con: clamp((batting.con + bowling.con) / 2),
    pwr: clamp((batting.pwr + bowling.pwr) / 2),
    dth: clamp((batting.dth + bowling.dth) / 2),
    eco: clamp((batting.eco + bowling.eco) / 2),
    wkt: clamp((batting.wkt + bowling.wkt) / 2),
    clt: clamp((batting.clt + bowling.clt) / 2),
  };
}

export function computeOverall(stats: CricketStats, role: PlayerRole): number {
  const weights: Record<
    PlayerRole,
    Partial<Record<keyof CricketStats, number>>
  > = {
    batter: {
      bat: 0.22,
      con: 0.2,
      pwr: 0.15,
      dth: 0.18,
      clt: 0.15,
      eco: 0.05,
      wkt: 0.05,
    },
    wicketkeeper: {
      bat: 0.24,
      con: 0.18,
      pwr: 0.14,
      dth: 0.2,
      clt: 0.14,
      eco: 0.05,
      wkt: 0.05,
    },
    bowler: {
      eco: 0.24,
      wkt: 0.22,
      dth: 0.2,
      con: 0.14,
      pwr: 0.1,
      clt: 0.05,
      bat: 0.05,
    },
    'all-rounder': {
      bat: 0.14,
      eco: 0.14,
      wkt: 0.14,
      dth: 0.14,
      con: 0.14,
      pwr: 0.14,
      clt: 0.14,
    },
  };
  const w = weights[role];
  let total = 0;
  let weightSum = 0;
  for (const [k, v] of Object.entries(w)) {
    const key = k as keyof CricketStats;
    total += stats[key] * (v ?? 0);
    weightSum += v ?? 0;
  }
  return clamp(total / weightSum);
}

export function tierFromOverall(overall: number): CardTier {
  if (overall >= 92) return 'icon';
  if (overall >= 88) return 'toty';
  if (overall >= 84) return 'totw';
  if (overall >= 78) return 'gold';
  if (overall >= 68) return 'silver';
  return 'bronze';
}

export function archetypeFromStats(
  role: PlayerRole,
  stats: CricketStats,
): string {
  const entries = Object.entries(stats) as [StatKey, number][];
  const top = [...entries].sort((a, b) => b[1] - a[1])[0][0];
  const map: Record<StatKey, string> = {
    bat: 'Anchor',
    con: 'Rock Solid',
    pwr: 'Powerplay Hunter',
    dth: 'Death Specialist',
    eco: 'Economy King',
    wkt: 'Wicket Magnet',
    clt: 'Clutch Performer',
  };
  const prefix =
    role === 'bowler'
      ? 'Strike'
      : role === 'all-rounder'
        ? 'Complete'
        : role === 'wicketkeeper'
          ? 'Finisher'
          : 'Classic';
  return `${prefix} ${map[top]}`;
}

export function buildRatedCard(
  profile: PlayerProfile,
  agg: PlayerAggregates,
  league: LeagueCode,
): RatedPlayerCard {
  const role = detectRole(profile);
  const stats = computeStats(role, agg);
  const overall = computeOverall(stats, role);
  return {
    player: { ...profile, role, league },
    overall,
    tier: tierFromOverall(overall),
    archetype: archetypeFromStats(role, stats),
    stats,
    aggregates: agg,
  };
}
