import { defaultStatsColumns } from '@/components/generative-ui/utils';
import {
  dismissalBreakdownColumns,
  isDismissalBreakdownRows,
  normalizeDismissalRows,
} from '@/lib/dismissal-table';

const CANONICAL_KEYS = defaultStatsColumns().map((c) => c.key);

/** LLM / prompt aliases → canonical career-stats keys used by StatsTable. */
const FIELD_ALIASES: Record<string, readonly string[]> = {
  seasonName: ['season', 'season_name', 'year', 'Season', 'seasonYear'],
  leagueName: ['league', 'league_name', 'competition', 'tournament'],
  formatType: ['format', 'format_type', 'matchType'],
  battingRuns: ['runs', 'batting_runs', 'totalRuns', 'total_runs', 'Runs'],
  battingAverage: ['average', 'avg', 'batting_average', 'Avg', 'battingAvg'],
  battingStrikeRate: [
    'strikeRate',
    'strike_rate',
    'sr',
    'SR',
    'batting_strike_rate',
  ],
  bowlingWickets: ['wickets', 'wkts', 'bowling_wickets', 'Wkts'],
  bowlingEconomyRate: [
    'economy',
    'econ',
    'economyRate',
    'economy_rate',
    'bowling_economy_rate',
  ],
};

function camelToSnake(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function readField(row: Record<string, unknown>, key: string): unknown {
  if (isPresent(row[key])) return row[key];

  for (const alias of FIELD_ALIASES[key] ?? []) {
    if (isPresent(row[alias])) return row[alias];
  }

  const snake = camelToSnake(key);
  if (isPresent(row[snake])) return row[snake];

  return undefined;
}

/** Map one loose stats row to canonical column keys. */
export function normalizeStatsRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of CANONICAL_KEYS) {
    const value = readField(row, key);
    if (isPresent(value)) out[key] = value;
  }
  return out;
}

export function normalizeStatsRows(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map(normalizeStatsRow);
}

function isObjectRow(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Resolve row list from manifest / agent stats_table payloads. */
export function coalesceStatsTableRows(
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const candidates = [
    data.rows,
    data.careerStats,
    data.career_stats,
    data.stats,
    data.seasons,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;
    const first = candidate[0];
    if (isObjectRow(first)) {
      return candidate as Array<Record<string, unknown>>;
    }
  }

  return [];
}

/** Normalize stats_table component data for chat manifest rendering. */
export function normalizeStatsTableData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (Array.isArray(data.headers) && Array.isArray(data.rows)) {
    const first = data.rows[0];
    if (!isObjectRow(first)) {
      return data;
    }
  }

  const rawRows = coalesceStatsTableRows(data);
  if (rawRows.length === 0) return data;

  if (isDismissalBreakdownRows(rawRows)) {
    return {
      ...data,
      columns: Array.isArray(data.columns) && data.columns.length
        ? data.columns
        : dismissalBreakdownColumns(),
      rows: normalizeDismissalRows(rawRows),
    };
  }

  return {
    ...data,
    rows: normalizeStatsRows(rawRows),
  };
}

export function statsRowCellValue(
  row: Record<string, unknown>,
  columnKey: string,
): unknown {
  const normalized = normalizeStatsRow(row);
  return normalized[columnKey];
}
