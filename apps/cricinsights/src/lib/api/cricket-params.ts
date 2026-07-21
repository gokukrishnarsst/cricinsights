import type { LeaderboardMetric } from '@cricket-ai/database';

export function requiredQuery(
  params: URLSearchParams,
  key: string,
): string {
  const value = params.get(key);
  if (!value?.trim()) {
    throw new Error(`Invalid query parameter: ${key} is required`);
  }
  return value.trim();
}

export function optionalQuery(
  params: URLSearchParams,
  key: string,
): string | undefined {
  const value = params.get(key);
  return value?.trim() ? value.trim() : undefined;
}

export function parseSportmonksId(
  value: string,
  label = 'id',
): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: must be a positive integer`);
  }
  return parsed;
}

export function parseRouteId(value: string, label = 'id'): number {
  return parseSportmonksId(value, label);
}

export function optionalSportmonksId(
  params: URLSearchParams,
  key: string,
): number | undefined {
  const raw = optionalQuery(params, key);
  return raw === undefined ? undefined : parseSportmonksId(raw, key);
}

export function optionalLimit(
  params: URLSearchParams,
  fallback: number,
  max = 100,
): number {
  const raw = optionalQuery(params, 'limit');
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Invalid limit: must be a positive integer');
  }
  return Math.min(parsed, max);
}

export function mapLeaderboardMetric(raw: string): LeaderboardMetric {
  const normalized = raw.toLowerCase().replaceAll('-', '_');

  switch (normalized) {
    case 'runs':
    case 'batting_runs':
      return 'batting_runs';
    case 'wickets':
    case 'bowling_wickets':
      return 'bowling_wickets';
    case 'batting_wickets':
      return 'batting_wickets';
    case 'strike_rate':
      return 'strike_rate';
    case 'economy':
    case 'economy_rate':
      return 'economy_rate';
    case 'net_run_rate':
    case 'nrr':
      return 'net_run_rate';
    default:
      throw new Error(
        `Invalid metric. Supported: runs, wickets, strike_rate, economy, net_run_rate`,
      );
  }
}

export async function parseDynamicParams<T extends Record<string, string>>(
  params: Promise<T>,
): Promise<T> {
  return params;
}
