import type { CardTier, CricketStats, PlayerRole, RatedPlayerCard, StatKey } from "@/types/cricket";
import { STAT_FULL, STAT_LABELS } from "@/lib/scoring/engine";
import { formatCount, round1 } from "@/lib/utils";

export interface ScoutMetric {
  label: string;
  value: number;
  score: number;
  unit?: string;
}

export interface ScoutPlaystyle {
  name: string;
  reason: string;
  plus?: boolean;
}

export interface ScoutReport {
  skillMoves: number;
  weakFoot: number;
  workRate: { attack: string; defense: string };
  style: string;
  reasons: {
    skillMoves: string;
    weakFoot: string;
    workRate: string;
    style: string;
  };
  playstyles: ScoutPlaystyle[];
  metrics: ScoutMetric[];
  verdict: string;
  blurb: string;
}

export const TIER_LABELS: Record<CardTier, string> = {
  icon: "ICON",
  toty: "TOTY",
  totw: "TOTW",
  gold: "GOLD",
  silver: "SILVER",
  bronze: "BRONZE",
};

const VERDICTS: Record<CardTier, string> = {
  icon: "Generational talent",
  toty: "Elite prospect",
  totw: "In-form, in demand",
  gold: "First-team ready",
  silver: "Squad rotation",
  bronze: "One to watch",
};

function starRating(score: number): number {
  if (score >= 90) return 5;
  if (score >= 78) return 4;
  if (score >= 65) return 3;
  if (score >= 50) return 2;
  return 1;
}

function weakestStat(stats: CricketStats): StatKey {
  const entries = Object.entries(stats) as [StatKey, number][];
  return [...entries].sort((a, b) => a[1] - b[1])[0][0];
}

function workRateForRole(role: PlayerRole, stats: CricketStats) {
  const attack =
    role === "bowler"
      ? stats.wkt >= stats.eco ? "High" : "Med"
      : stats.bat >= stats.pwr ? "High" : "Med";
  const defense =
    role === "bowler"
      ? stats.eco >= 70 ? "High" : stats.eco >= 55 ? "Med" : "Low"
      : stats.con >= 70 ? "High" : stats.con >= 55 ? "Med" : "Low";
  return { attack, defense };
}

function buildPlaystyles(card: RatedPlayerCard): ScoutPlaystyle[] {
  const { stats, aggregates, player } = card;
  const styles: ScoutPlaystyle[] = [];

  if (stats.pwr >= 78) {
    styles.push({
      name: "Powerplay Hunter",
      reason: `Powerplay strike impact rated ${stats.pwr}/99.`,
      plus: stats.pwr >= 88,
    });
  }
  if (stats.dth >= 78) {
    styles.push({
      name: "Death Merchant",
      reason: `Death-overs threat rated ${stats.dth}/99.`,
      plus: stats.dth >= 88,
    });
  }
  if (stats.eco >= 78) {
    styles.push({
      name: "Economy King",
      reason: `Economy control rated ${stats.eco}/99.`,
      plus: stats.eco >= 88,
    });
  }
  if (stats.wkt >= 78) {
    styles.push({
      name: "Wicket Magnet",
      reason: `Wicket threat rated ${stats.wkt}/99.`,
      plus: stats.wkt >= 88,
    });
  }
  if (stats.clt >= 80) {
    styles.push({
      name: "Clutch Finisher",
      reason: `Clutch rating ${stats.clt}/99 in high-pressure phases.`,
      plus: stats.clt >= 90,
    });
  }
  if (aggregates.matches >= 80) {
    styles.push({
      name: "Marathoner",
      reason: `${aggregates.matches} franchise matches — proven longevity.`,
      plus: aggregates.matches >= 150,
    });
  }
  if (aggregates.sixes >= 80 && aggregates.runs > 0) {
    styles.push({
      name: "Six Machine",
      reason: `${aggregates.sixes} sixes — elite boundary threat.`,
      plus: aggregates.sixes >= 150,
    });
  }
  if (aggregates.strikeRate >= 145) {
    styles.push({
      name: "Rapid Fire",
      reason: `Strike rate ${round1(aggregates.strikeRate)} — elite tempo.`,
      plus: aggregates.strikeRate >= 155,
    });
  }
  if (player.role === "all-rounder") {
    styles.push({
      name: "Complete Package",
      reason: "Balanced batting and bowling profile in franchise cricket.",
      plus: card.overall >= 82,
    });
  }

  return styles.slice(0, 7);
}

function normScore(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.max(4, Math.min(99, Math.round(1 + ((value - min) / (max - min)) * 98)));
}

export function buildScoutReport(card: RatedPlayerCard): ScoutReport {
  const { stats, aggregates, player } = card;
  const weak = weakestStat(stats);
  const weakAvg = Object.values(stats).sort((a, b) => a - b).slice(0, 3);
  const weakFootScore = Math.round(weakAvg.reduce((a, b) => a + b, 0) / weakAvg.length);
  const workRate = workRateForRole(player.role, stats);

  const statSpread = Object.values(stats);
  const skillMoves = starRating(
    Math.round(statSpread.reduce((a, b) => a + b, 0) / statSpread.length),
  );

  const ppSr =
    aggregates.powerplayBalls > 0
      ? (aggregates.powerplayRuns / aggregates.powerplayBalls) * 100
      : aggregates.strikeRate;
  const deathSr =
    aggregates.deathBalls > 0
      ? (aggregates.deathRuns / aggregates.deathBalls) * 100
      : aggregates.strikeRate;

  const metrics: ScoutMetric[] = [
    {
      label: "Strike rate",
      value: round1(aggregates.strikeRate),
      score: stats.bat,
      unit: "",
    },
    {
      label: "Average",
      value: round1(aggregates.average),
      score: stats.con,
      unit: "",
    },
    {
      label: "Runs",
      value: aggregates.runs,
      score: normScore(aggregates.runs, 200, 7000),
      unit: "",
    },
    {
      label: "Wickets",
      value: aggregates.wickets,
      score: stats.wkt,
      unit: "",
    },
    {
      label: "Economy",
      value: round1(aggregates.economy || 0),
      score: stats.eco,
      unit: "",
    },
    {
      label: "Powerplay SR",
      value: round1(ppSr),
      score: stats.pwr,
      unit: "",
    },
    {
      label: "Death SR",
      value: round1(deathSr),
      score: stats.dth,
      unit: "",
    },
    {
      label: "Matches",
      value: aggregates.matches,
      score: normScore(aggregates.matches, 10, 200),
      unit: "",
    },
  ].filter((m) => m.value > 0 || m.label === "Matches");

  return {
    skillMoves,
    weakFoot: starRating(weakFootScore),
    workRate,
    style: card.archetype.split(" ").slice(-2).join(" ") || "All-rounder",
    reasons: {
      skillMoves: `Technical range across ${statSpread.filter((s) => s >= 60).length} strong attributes.`,
      weakFoot: `Weakest area: ${STAT_FULL[weak]} (${stats[weak]}/99).`,
      workRate: `Attack ${workRate.attack} from phase impact; defense ${workRate.defense} from consistency.`,
      style: `${card.archetype} — shaped by top ${STAT_LABELS[Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0] as StatKey]} rating.`,
    },
    playstyles: buildPlaystyles(card),
    metrics,
    verdict: VERDICTS[card.tier],
    blurb: `${card.archetype} with ${formatCount(aggregates.runs)} runs across ${aggregates.matches} ${player.league ?? "franchise"} matches`,
  };
}
