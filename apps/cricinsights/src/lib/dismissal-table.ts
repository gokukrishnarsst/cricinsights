import type { StatsColumn } from '@/components/generative-ui/types';

const DISMISSAL_BUCKETS = [
  { key: 'byDismissalType', title: 'Dismissals by type' },
  { key: 'byBowlerType', title: 'Dismissals by bowler type' },
  { key: 'byBowlingStyle', title: 'Dismissals by bowling style' },
  { key: 'byPhase', title: 'Dismissals by phase' },
] as const;

export function dismissalBreakdownColumns(): StatsColumn[] {
  return [
    { key: 'label', label: 'Type', align: 'left', format: 'text' },
    { key: 'count', label: 'Count', align: 'right', format: 'number' },
    { key: 'percentage', label: '%', align: 'right', format: 'decimal' },
  ];
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Humanize "right-arm-fast-medium" / "middle" style labels. */
export function humanizeDismissalLabel(raw: string): string {
  const cleaned = raw.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) return raw;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function readLabel(row: Record<string, unknown>): string | undefined {
  for (const key of ['label', 'type', 'name', 'category', 'phase', 'style']) {
    const v = row[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function readCount(row: Record<string, unknown>): number | undefined {
  for (const key of ['count', 'dismissals', 'value', 'total', 'n']) {
    if (!isPresent(row[key])) continue;
    const n = Number(row[key]);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function readPercentage(row: Record<string, unknown>): number | undefined {
  for (const key of ['percentage', 'percent', 'pct', 'share']) {
    if (!isPresent(row[key])) continue;
    const n = Number(row[key]);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** True when rows look like dismissal breakdowns (Type / Count / %), not career seasons. */
export function isDismissalBreakdownRows(
  rows: Array<Record<string, unknown>>,
): boolean {
  if (!rows.length) return false;
  const sample = rows.slice(0, Math.min(3, rows.length));
  let hits = 0;
  for (const row of sample) {
    const hasLabel = Boolean(readLabel(row));
    const hasCount = readCount(row) !== undefined;
    const hasCareer =
      isPresent(row.seasonName) ||
      isPresent(row.battingRuns) ||
      isPresent(row.season) ||
      isPresent(row.runs);
    if (hasLabel && hasCount && !hasCareer) hits += 1;
  }
  return hits >= Math.ceil(sample.length / 2);
}

export function normalizeDismissalRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const label = readLabel(row);
  const count = readCount(row);
  const percentage = readPercentage(row);
  return {
    ...row,
    ...(label !== undefined
      ? { label: humanizeDismissalLabel(label) }
      : {}),
    ...(count !== undefined ? { count } : {}),
    ...(percentage !== undefined ? { percentage } : {}),
  };
}

export function normalizeDismissalRows(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map(normalizeDismissalRow);
}

function bucketRows(
  dismissal: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> {
  const raw = dismissal[key];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .filter((r): r is Record<string, unknown> => asRecord(r) !== null)
    .map(normalizeDismissalRow);
}

export function buildDismissalStatsTables(
  dismissal: Record<string, unknown>,
  options?: { playerName?: string; scopeLabel?: string },
): Array<{ type: 'stats_table'; data: Record<string, unknown> }> {
  const name =
    options?.playerName ||
    (typeof dismissal.playerName === 'string' ? dismissal.playerName : 'Player');
  const scope =
    options?.scopeLabel ||
    inferScopeLabel(dismissal) ||
    'career';
  const prefix = `${name} ${scope}`;
  const tables: Array<{ type: 'stats_table'; data: Record<string, unknown> }> =
    [];

  for (const bucket of DISMISSAL_BUCKETS) {
    const rows = bucketRows(dismissal, bucket.key);
    if (!rows.length) continue;
    tables.push({
      type: 'stats_table',
      data: {
        title: `${prefix} ${bucket.title.toLowerCase()}`,
        columns: dismissalBreakdownColumns(),
        rows,
      },
    });
  }

  return tables;
}

function inferScopeLabel(dismissal: Record<string, unknown>): string | null {
  const scope = asRecord(dismissal.scope);
  if (!scope) return null;
  const league = scope.leagueName ?? scope.league;
  const format = scope.format;
  if (typeof league === 'string' && /premier|ipl/i.test(league)) return 'IPL';
  if (typeof league === 'string' && league.trim()) return league;
  if (typeof format === 'string' && format.trim()) return format.toUpperCase();
  return null;
}

export function dismissalHasRows(dismissal: Record<string, unknown>): boolean {
  return DISMISSAL_BUCKETS.some(
    (bucket) => bucketRows(dismissal, bucket.key).length > 0,
  );
}

export function dismissalNarrative(dismissal: Record<string, unknown>): string {
  const name =
    typeof dismissal.playerName === 'string'
      ? dismissal.playerName
      : 'This player';
  const total = Number(dismissal.totalDismissals ?? 0);
  const notOuts = Number(dismissal.notOuts ?? 0);
  const byType = bucketRows(dismissal, 'byDismissalType');
  const byPace = bucketRows(dismissal, 'byBowlerType');
  const byPhase = bucketRows(dismissal, 'byPhase');

  const topType = byType[0];
  const topBowler = byPace[0];
  const topPhase = byPhase[0];

  const parts = [
    `${name} has ${total} recorded dismissals${notOuts ? ` (+ ${notOuts} not-outs)` : ''} in the ingested IPL scorecard sample.`,
  ];
  if (topType) {
    parts.push(
      `${topType.label} leads dismissal types (${topType.count}, ${topType.percentage}%).`,
    );
  }
  if (topBowler) {
    parts.push(
      `Most often dismissed by ${String(topBowler.label).toLowerCase()} bowling (${topBowler.percentage}%).`,
    );
  }
  if (topPhase) {
    parts.push(
      `${topPhase.percentage}% of dismissals fall in the ${String(topPhase.label).toLowerCase()} phase.`,
    );
  }
  parts.push(
    'Coverage is partial — treat as indicative rather than a complete career record (SportMonks / CricInsights).',
  );
  return parts.join(' ');
}

/** True if a stats_table looks like a failed career-column render of dismissal data. */
export function statsTableNeedsDismissalHydration(
  data: Record<string, unknown>,
): boolean {
  const title = String(data.title ?? '').toLowerCase();
  const titleHintsDismissal = /dismissal|phase|bowler type|bowling style/.test(
    title,
  );
  const rows = Array.isArray(data.rows)
    ? (data.rows as Array<Record<string, unknown>>).filter(
        (r) => r && typeof r === 'object' && !Array.isArray(r),
      )
    : [];
  if (isDismissalBreakdownRows(rows)) return true;
  if (!titleHintsDismissal) return false;
  if (!rows.length) return true;
  // Career columns with no career values → empty dashes case from the screenshot
  const first = rows[0];
  const hasCareerValue =
    isPresent(first.seasonName) ||
    isPresent(first.battingRuns) ||
    isPresent(first.runs);
  const hasDismissalValue =
    readLabel(first) !== undefined && readCount(first) !== undefined;
  return !hasCareerValue || hasDismissalValue;
}
