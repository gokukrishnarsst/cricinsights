import type {
  IntelligenceItem,
  PhaseImpact,
  PlayerIntelligence,
  PlayerRole,
  RatedPlayerCard,
} from '@/types/cricket';
import type { UIComponent } from '@/lib/template-engine';

interface ScoutStatsBundle {
  stats: Record<string, unknown>;
  dismissal: Record<string, unknown> | null;
  filters?: { name?: string; leagueId?: number };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function topLabel(
  rows: unknown,
): { label: string; percentage: number } | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const sorted = [...rows].sort(
    (a, b) =>
      num((b as Record<string, unknown>).percentage) -
      num((a as Record<string, unknown>).percentage),
  );
  const top = sorted[0] as Record<string, unknown>;
  return {
    label: String(top.label ?? ''),
    percentage: num(top.percentage),
  };
}

function buildIntelligence(data: ScoutStatsBundle): PlayerIntelligence {
  const statsRoot = asRecord(data.stats.data) ?? asRecord(data.stats) ?? {};
  const profile = asRecord(statsRoot.profile) ?? {};
  const highlights = asRecord(statsRoot.highlights) ?? {};
  const careerStats = Array.isArray(statsRoot.careerStats)
    ? statsRoot.careerStats
    : [];

  const totalRuns = num(highlights.totalBattingRuns);
  const seasons = num(highlights.seasonsTracked) || careerStats.length;
  const avgRows = careerStats.filter(
    (r) => num((r as Record<string, unknown>).battingRuns) > 0,
  );
  const careerAvg =
    avgRows.length > 0
      ? avgRows.reduce(
          (s, r) => s + num((r as Record<string, unknown>).battingAverage),
          0,
        ) / avgRows.length
      : 0;
  const careerSr =
    avgRows.length > 0
      ? avgRows.reduce(
          (s, r) => s + num((r as Record<string, unknown>).battingStrikeRate),
          0,
        ) / avgRows.length
      : 0;

  const strengths: IntelligenceItem[] = [];
  const gaps: IntelligenceItem[] = [];

  if (totalRuns >= 4000) {
    strengths.push({
      key: 'bat',
      label: 'Volume run-scorer',
      rating: Math.min(99, 70 + Math.floor(totalRuns / 500)),
      evidence: `${totalRuns.toLocaleString()} runs across ${seasons} IPL seasons in our database.`,
      modelled: false,
    });
  }
  if (careerAvg >= 40) {
    strengths.push({
      key: 'con',
      label: 'High batting average',
      rating: Math.min(99, Math.round(careerAvg + 35)),
      evidence: `Career IPL average ${careerAvg.toFixed(1)} across tracked seasons.`,
      modelled: false,
    });
  }
  if (careerSr >= 135) {
    strengths.push({
      key: 'pwr',
      label: 'Strong strike rate',
      rating: Math.min(99, Math.round(careerSr / 2)),
      evidence: `Career IPL strike rate ${careerSr.toFixed(1)}.`,
      modelled: false,
    });
  }

  const dismissal = data.dismissal;
  if (dismissal) {
    const topDismissal = topLabel(dismissal.byDismissalType);
    const topPaceSpin = topLabel(dismissal.byBowlerType);
    const topPhase = topLabel(dismissal.byPhase);

    if (topDismissal && topDismissal.percentage >= 50) {
      gaps.push({
        key: 'clt',
        label: `Dismissal pattern: ${topDismissal.label}`,
        rating: Math.max(25, 100 - Math.round(topDismissal.percentage)),
        evidence: `${topDismissal.percentage}% of recorded dismissals are ${topDismissal.label.toLowerCase()} (scorecard sample).`,
        modelled: true,
      });
    }
    if (topPaceSpin?.label === 'pace' && topPaceSpin.percentage >= 65) {
      gaps.push({
        key: 'dth',
        label: 'More dismissals vs pace',
        rating: Math.max(30, 100 - Math.round(topPaceSpin.percentage / 2)),
        evidence: `${topPaceSpin.percentage}% of dismissals in the sample are against pace bowling.`,
        modelled: true,
      });
    }
    if (topPhase?.label === 'powerplay' && topPhase.percentage >= 35) {
      gaps.push({
        key: 'pwr',
        label: 'Powerplay vulnerability',
        rating: Math.max(35, 100 - Math.round(topPhase.percentage)),
        evidence: `${topPhase.percentage}% of dismissals occur in the powerplay in ingested scorecards.`,
        modelled: true,
      });
    }
    if (topPhase?.label === 'middle' && topPhase.percentage >= 45) {
      strengths.push({
        key: 'con',
        label: 'Middle-overs control',
        rating: Math.min(90, 50 + Math.round(topPhase.percentage / 2)),
        evidence: `Builds innings through the middle overs (${topPhase.percentage}% of dismissals there).`,
        modelled: true,
      });
    }
  }

  if (strengths.length === 0 && totalRuns > 0) {
    strengths.push({
      key: 'bat',
      label: 'Proven IPL run-getter',
      rating: 75,
      evidence: `${totalRuns.toLocaleString()} IPL runs in SportMonks / CricInsights data.`,
      modelled: false,
    });
  }

  const phases: PhaseImpact[] = [];
  if (Array.isArray(dismissal?.byPhase)) {
    for (const row of dismissal.byPhase as Record<string, unknown>[]) {
      const raw = String(row.label ?? 'middle').toLowerCase();
      const phase: PhaseImpact['phase'] =
        raw.includes('power') ? 'Powerplay' : raw.includes('death') ? 'Death' : 'Middle';
      phases.push({
        phase,
        strikeRate: 0,
        runShare: num(row.percentage),
        modelled: true,
      });
    }
  }

  const fullname = String(profile.fullname ?? data.filters?.name ?? 'Player');
  const role: PlayerRole = 'batter';
  const card: RatedPlayerCard = {
    player: {
      id: num(profile.sportmonksId),
      fullname,
      role,
      battingStyle: profile.battingstyle
        ? String(profile.battingstyle)
        : undefined,
      bowlingStyle: profile.bowlingstyle
        ? String(profile.bowlingstyle)
        : undefined,
      avatarUrl: profile.imagePath ? String(profile.imagePath) : '',
    },
    overall: Math.min(99, Math.round(55 + careerAvg / 2 + careerSr / 20)),
    tier: 'gold',
    archetype: 'Run accumulator',
    stats: { bat: 85, con: 80, pwr: 78, dth: 70, eco: 0, wkt: 0, clt: 75 },
    aggregates: {
      matches: 0,
      runs: totalRuns,
      balls: 0,
      strikeRate: careerSr,
      average: careerAvg,
      fours: 0,
      sixes: 0,
      wickets: num(highlights.totalBowlingWickets),
      overs: 0,
      economy: 0,
      bowlingAverage: 0,
      powerplayRuns: 0,
      powerplayBalls: 0,
      deathRuns: 0,
      deathBalls: 0,
      middleRuns: 0,
      middleBalls: 0,
    },
  };

  const leagueLabel =
    data.filters?.leagueId === 1 ? 'IPL' : 'selected league scope';

  return {
    card,
    role,
    strengths,
    gaps,
    phases,
    benchmarks: [],
    benchmarkScope: leagueLabel,
    form: {
      index: Math.min(99, Math.round(careerAvg + 20)),
      consistency: Math.min(99, Math.round(50 + seasons * 3)),
      note: 'Based on career aggregates and dismissal sample from ingested scorecards.',
    },
    summary: `${fullname}'s ${leagueLabel} profile combines ${totalRuns.toLocaleString()} career runs with data-grounded dismissal patterns where scorecard coverage exists. Partial scorecard ingest does not mean career stats are missing.`,
  };
}

export function buildPlayerScoutManifest(payload: Record<string, unknown>): {
  components: UIComponent[];
  narrative: string;
} {
  const root = asRecord(payload.data) ?? payload;
  const bundle: ScoutStatsBundle = {
    stats: asRecord(root.stats) ?? {},
    dismissal: asRecord(root.dismissal),
    filters: asRecord(root.filters) as ScoutStatsBundle['filters'],
  };

  const statsRoot = asRecord(bundle.stats.data) ?? bundle.stats;
  const profile = asRecord(statsRoot?.profile) ?? {};
  const highlights = asRecord(statsRoot?.highlights) ?? {};
  const careerStats = Array.isArray(statsRoot?.careerStats)
    ? statsRoot.careerStats
    : [];
  const name = String(profile.fullname ?? bundle.filters?.name ?? 'Player');
  const leagueLabel = bundle.filters?.leagueId === 1 ? 'IPL' : 'league';

  const intelligence = buildIntelligence(bundle);

  const components: UIComponent[] = [
    {
      type: 'player_card',
      data: {
        profile,
        highlights,
        careerStats,
      },
    },
    {
      type: 'stats_table',
      data: {
        title: `${name} ${leagueLabel} season-by-season`,
        rows: careerStats,
      },
    },
    {
      type: 'strengths_gaps',
      data: { intelligence },
    },
  ];

  const totalRuns = num(highlights.totalBattingRuns);
  const narrative = `${name} has ${totalRuns.toLocaleString()} ${leagueLabel} runs across ${num(highlights.seasonsTracked) || careerStats.length} tracked seasons (SportMonks / CricInsights database). Strengths and development areas below combine career stats with dismissal analysis from ingested scorecards (sample may be partial).`;

  return { components, narrative };
}

export { buildIntelligence as buildScoutIntelligence };
