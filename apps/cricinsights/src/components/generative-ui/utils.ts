import type { CareerStatsRow, LeaderboardRow } from './types';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Daylight Studio panel — matches chat bubbles and landing cards. */
export const glassCard =
  'rounded-2xl border border-line/80 bg-card/90 shadow-[0_12px_32px_-18px_rgba(30,46,94,.18)]';

export const surfaceInset =
  'rounded-xl border border-line/70 bg-surface-2/50';

export const statNum = 'tabular-nums font-variant-numeric tabular-nums';

export const entrance =
  'animate-rise-soft motion-reduce:animate-none';

export function formatNumber(value: unknown, decimals = 0): string {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDecimal(value: unknown, decimals = 1): string {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}

export function humanizeStyle(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function entityName(
  profile?: { fullname?: string; name?: string; firstname?: string | null; lastname?: string | null },
): string {
  if (!profile) return 'Unknown';
  if (profile.fullname) return profile.fullname;
  if (profile.name) return profile.name;
  return [profile.firstname, profile.lastname].filter(Boolean).join(' ') || 'Unknown';
}

export function normalizeComponentType(type: string): string {
  return type
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

export function leaderboardRows(data: {
  rows?: LeaderboardRow[];
  standings?: LeaderboardRow[];
  entries?: LeaderboardRow[];
  leaderboard?: LeaderboardRow[];
}): LeaderboardRow[] {
  return (
    data.rows ??
    data.standings ??
    data.entries ??
    data.leaderboard ??
    []
  );
}

export function defaultStatsColumns(): Array<{
  key: string;
  label: string;
  align: 'left' | 'right';
  format: 'text' | 'number' | 'decimal';
}> {
  return [
    { key: 'seasonName', label: 'Season', align: 'left', format: 'text' },
    { key: 'leagueName', label: 'League', align: 'left', format: 'text' },
    { key: 'formatType', label: 'Format', align: 'left', format: 'text' },
    { key: 'battingRuns', label: 'Runs', align: 'right', format: 'number' },
    { key: 'battingAverage', label: 'Avg', align: 'right', format: 'decimal' },
    { key: 'battingStrikeRate', label: 'SR', align: 'right', format: 'decimal' },
    { key: 'bowlingWickets', label: 'Wkts', align: 'right', format: 'number' },
    { key: 'bowlingEconomyRate', label: 'Econ', align: 'right', format: 'decimal' },
  ];
}

export function careerToTrendSeries(rows: CareerStatsRow[]) {
  return rows.map((row) => ({
    season: row.seasonName ?? String(row.seasonId ?? ''),
    runs: row.battingRuns ?? 0,
    wickets: row.bowlingWickets ?? 0,
  }));
}

export function diffTone(leader?: string, side?: 'a' | 'b'): string {
  if (!leader || leader === 'tie') return 'text-ink-soft';
  if (leader === side) return 'text-emerald font-semibold';
  return 'text-ink-mute';
}
