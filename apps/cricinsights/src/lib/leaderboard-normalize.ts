import type { LeaderboardRow } from '@/components/generative-ui/types';

const TEAM_NAME_KEYS = [
  'teamName',
  'team_name',
  'team',
  'name',
  'teamFullName',
  'team_full_name',
] as const;

const PLAYER_NAME_KEYS = [
  'playerName',
  'player_name',
  'player',
  'batsman',
  'bowler',
  'fullname',
  'full_name',
] as const;

function pickNumber(row: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const raw = row[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function pickNameField(row: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      const nested =
        obj.name ?? obj.fullname ?? obj.fullName ?? obj.teamName ?? obj.title;
      if (typeof nested === 'string' && nested.trim()) return nested;
    }
  }
  return undefined;
}

/** Map loose LLM / MCP standings rows to LeaderboardTable fields. */
export function normalizeLeaderboardRow(
  row: Record<string, unknown>,
): LeaderboardRow {
  const teamName = pickNameField(row, TEAM_NAME_KEYS);
  const playerName = pickNameField(row, PLAYER_NAME_KEYS);

  const rank = pickNumber(row, ['rank', 'position', 'pos', 'table_position']);
  const position =
    pickNumber(row, ['position', 'pos', 'rank', 'table_position']) ?? null;

  const points =
    pickNumber(row, ['points', 'pts', 'point', 'total_points']) ?? null;
  const value = pickNumber(row, ['value', 'runs', 'wickets', 'metric_value']);

  const played =
    pickNumber(row, [
      'played',
      'p',
      'matches',
      'mp',
      'games',
      'played_matches',
    ]) ?? null;
  const won = pickNumber(row, ['won', 'w', 'wins', 'win']) ?? null;
  const lost =
    pickNumber(row, ['lost', 'l', 'losses', 'loss', 'defeats']) ?? null;
  const netRunRate =
    pickNumber(row, [
      'netRunRate',
      'net_run_rate',
      'nrr',
      'run_rate',
      'net_rr',
    ]) ?? null;

  return {
    ...row,
    rank: rank ?? undefined,
    position,
    teamName,
    playerName,
    value: value ?? points ?? undefined,
    points,
    played,
    won,
    lost,
    netRunRate,
  };
}

export function normalizeLeaderboardRows(
  rows: Array<Record<string, unknown>>,
): LeaderboardRow[] {
  return rows.map(normalizeLeaderboardRow);
}

export function coalesceLeaderboardRows(
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const candidates = [
    data.rows,
    data.standings,
    data.entries,
    data.leaderboard,
    data.table,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      const first = candidate[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        return candidate as Array<Record<string, unknown>>;
      }
    }
  }

  return [];
}

export function normalizeLeaderboardTableData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const rawRows = coalesceLeaderboardRows(data);
  if (rawRows.length === 0) return data;

  const rows = normalizeLeaderboardRows(rawRows);
  return { ...data, rows };
}

export function isStandingsShape(row: LeaderboardRow): boolean {
  return (
    (row.points !== undefined && row.points !== null) ||
    (row.position !== undefined && row.position !== null) ||
    (row.played !== undefined && row.played !== null) ||
    (row.won !== undefined && row.won !== null)
  );
}
