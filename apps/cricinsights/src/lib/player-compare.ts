import type { CareerStatsRow, ComparisonCardData } from '@/components/generative-ui/types';
import { entityName } from '@/components/generative-ui/utils';

export interface PlayerBattingTotals {
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  average: number | null;
  strikeRate: number | null;
  fours: number;
  sixes: number;
}

export interface PlayerBowlingTotals {
  inningsBowled: number;
  overs: number;
  wickets: number;
  economy: number | null;
  average: number | null;
}

export interface EnrichedPlayerCompareSide {
  name: string;
  batting: PlayerBattingTotals;
  bowling: PlayerBowlingTotals;
}

export interface EnrichedPlayerComparison {
  contextLabel: string;
  playerA: EnrichedPlayerCompareSide;
  playerB: EnrichedPlayerCompareSide;
  insightBullets: string[];
  summaryParagraph: string;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumRows(
  rows: CareerStatsRow[],
  pick: (r: CareerStatsRow) => number | null | undefined,
): number {
  return rows.reduce((acc, row) => acc + num(pick(row)), 0);
}

function weightedRate(
  rows: CareerStatsRow[],
  valueKey: keyof CareerStatsRow,
  weightKey: keyof CareerStatsRow,
): number | null {
  let weightSum = 0;
  let weighted = 0;
  for (const row of rows) {
    const w = num(row[weightKey]);
    const v = row[valueKey];
    if (w <= 0 || v === null || v === undefined) continue;
    weightSum += w;
    weighted += num(v) * w;
  }
  if (weightSum <= 0) return null;
  return Math.round((weighted / weightSum) * 100) / 100;
}

function estimateBalls(row: CareerStatsRow): number {
  const runs = num(row.battingRuns);
  const sr = num(row.battingStrikeRate);
  if (runs <= 0) return 0;
  if (sr > 0) return Math.round((runs * 100) / sr);
  const innings = num(row.battingInnings);
  return innings > 0 ? innings * 20 : 0;
}

export function aggregateBatting(rows: CareerStatsRow[]): PlayerBattingTotals {
  const runs = sumRows(rows, (r) => r.battingRuns);
  const innings = sumRows(rows, (r) => r.battingInnings);
  const matches = sumRows(rows, (r) => r.battingMatches);
  const ballsFaced = rows.reduce((acc, r) => acc + estimateBalls(r), 0);
  const fours = sumRows(rows, (r) => r.battingFours);
  const sixes = sumRows(rows, (r) => r.battingSixes);

  const average =
    weightedRate(rows, 'battingAverage', 'battingInnings') ??
    (innings > 0 ? Math.round((runs / innings) * 100) / 100 : null);

  const strikeRate =
    ballsFaced > 0
      ? Math.round((runs / ballsFaced) * 10000) / 100
      : weightedRate(rows, 'battingStrikeRate', 'battingInnings');

  return {
    matches,
    innings,
    runs,
    ballsFaced,
    average,
    strikeRate,
    fours,
    sixes,
  };
}

export function aggregateBowling(rows: CareerStatsRow[]): PlayerBowlingTotals {
  const wickets = sumRows(rows, (r) => r.bowlingWickets);
  const overs = sumRows(rows, (r) => r.bowlingOvers);
  const inningsBowled = sumRows(rows, (r) => r.bowlingMatches);

  const economy = weightedRate(rows, 'bowlingEconomyRate', 'bowlingOvers');
  const average = weightedRate(rows, 'bowlingAverage', 'bowlingWickets');

  return {
    inningsBowled,
    overs: Math.round(overs * 10) / 10,
    wickets,
    economy,
    average: wickets > 0 ? average : null,
  };
}

function contextFromRows(rows: CareerStatsRow[]): string {
  if (rows.length === 0) return 'Career comparison';
  const league = rows[0].leagueName;
  const format = rows[0].formatType;
  if (league && format) return `${league} · ${String(format).toUpperCase()}`;
  if (league) return String(league);
  return 'Career comparison';
}

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] ?? full;
}

function buildInsights(
  a: EnrichedPlayerCompareSide,
  b: EnrichedPlayerCompareSide,
): string[] {
  const bullets: string[] = [];
  const nameA = lastName(a.name);
  const nameB = lastName(b.name);

  const innDiff = a.batting.innings - b.batting.innings;
  const runDiff = a.batting.runs - b.batting.runs;

  if (Math.abs(innDiff) >= 5 || Math.abs(runDiff) >= 200) {
    const leader = innDiff >= 0 && runDiff >= 0 ? nameA : runDiff > 0 ? nameA : nameB;
    const trailer = leader === nameA ? nameB : nameA;
    const lead = leader === nameA ? a : b;
    const trail = leader === nameA ? b : a;
    bullets.push(
      `${leader} has the bigger career footprint in this scope — ${fmt(lead.batting.innings)} innings and ${fmt(lead.batting.runs)} runs vs ${fmt(trail.batting.innings)} and ${fmt(trail.batting.runs)} for ${trailer}, reflecting more volume in the dataset.`,
    );
  }

  const srA = a.batting.strikeRate;
  const srB = b.batting.strikeRate;
  if (srA !== null && srB !== null && Math.abs(srA - srB) >= 3) {
    const faster = srA > srB ? nameA : nameB;
    const fast = faster === nameA ? a : b;
    const slow = faster === nameA ? b : a;
    bullets.push(
      `Per ball, ${faster} is the more explosive scorer: strike rate ${fmt(fast.batting.strikeRate, 2)} vs ${fmt(slow.batting.strikeRate, 2)}${fast.batting.average !== null && slow.batting.average !== null ? `, with average ${fmt(fast.batting.average, 2)} vs ${fmt(slow.batting.average, 2)}` : ''}.`,
    );
  }

  if (a.batting.innings > 0 && b.batting.innings > 0) {
    const sixRateA = a.batting.sixes / a.batting.innings;
    const sixRateB = b.batting.sixes / b.batting.innings;
    if (Math.abs(sixRateA - sixRateB) >= 0.08) {
      const leader = sixRateA > sixRateB ? nameA : nameB;
      const trail = leader === nameA ? nameB : nameA;
      const lead = leader === nameA ? a : b;
      const trailSide = leader === nameA ? b : a;
      const leadRate = leader === nameA ? sixRateA : sixRateB;
      const trailRate = leader === nameA ? sixRateB : sixRateA;
      bullets.push(
        `Six-hitting rate favors ${leader} — ${fmt(lead.batting.sixes)} sixes in ${fmt(lead.batting.innings)} innings (≈${leadRate.toFixed(2)}/inn) vs ${fmt(trailSide.batting.sixes)} in ${fmt(trailSide.batting.innings)} for ${trail} (≈${trailRate.toFixed(2)}/inn).`,
      );
    }
  }

  const bowlNote = (side: EnrichedPlayerCompareSide, label: string): string | null => {
    const w = side.bowling.wickets;
    const inn = side.bowling.inningsBowled;
    if (inn <= 0 && w <= 0) return `${label} has essentially no bowling in this scope.`;
    if (w <= 1 && inn <= 8) {
      return `${label} is at most a part-timer (${fmt(w)} wicket${w === 1 ? '' : 's'} in ${fmt(inn)} bowling spell${inn === 1 ? '' : 's'}${side.bowling.economy !== null ? `, economy ${fmt(side.bowling.economy, 2)}` : ''}).`;
    }
    return null;
  };

  const noteA = bowlNote(a, nameA);
  const noteB = bowlNote(b, nameB);
  if (noteA && noteB) {
    bullets.push(`Bowling is a non-factor for both: ${noteA.replace(/\.$/, '')}; ${noteB.charAt(0).toLowerCase()}${noteB.slice(1)}`);
  } else if (noteA || noteB) {
    bullets.push(`Bowling: ${noteA ?? noteB}`);
  }

  if (bullets.length === 0) {
    bullets.push(
      `Both players are closely matched on the core batting numbers in this scope — compare innings, strike rate, and boundary counts in the tables above.`,
    );
  }

  return bullets;
}

export function enrichPlayerComparisonData(
  data: ComparisonCardData,
): EnrichedPlayerComparison | null {
  if (data.comparisonType === 'team_vs_team') return null;

  const rowsA = data.entityA?.careerStats ?? [];
  const rowsB = data.entityB?.careerStats ?? [];
  if (rowsA.length === 0 && rowsB.length === 0) return null;

  const nameA = entityName(data.entityA?.profile);
  const nameB = entityName(data.entityB?.profile);

  const playerA: EnrichedPlayerCompareSide = {
    name: nameA,
    batting: aggregateBatting(rowsA),
    bowling: aggregateBowling(rowsA),
  };
  const playerB: EnrichedPlayerCompareSide = {
    name: nameB,
    batting: aggregateBatting(rowsB),
    bowling: aggregateBowling(rowsB),
  };

  const contextLabel = contextFromRows(rowsA.length ? rowsA : rowsB);
  const insightBullets = buildInsights(playerA, playerB);
  const summaryParagraph = insightBullets.join(' ');

  return {
    contextLabel,
    playerA,
    playerB,
    insightBullets,
    summaryParagraph,
  };
}

export function formatComparisonNarrative(
  enriched: EnrichedPlayerComparison,
): string {
  return `${enriched.playerA.name} vs ${enriched.playerB.name} (${enriched.contextLabel}) — career aggregates from our database. See the breakdown and analysis below.`;
}
