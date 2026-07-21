import { NextResponse } from 'next/server';

export type CacheProfile =
  | 'entity'
  | 'standings'
  | 'fixtures'
  | 'insights';

const CACHE_HEADERS: Record<CacheProfile, string> = {
  entity: 'public, s-maxage=300, stale-while-revalidate=600',
  standings: 'public, s-maxage=60, stale-while-revalidate=120',
  fixtures: 'public, s-maxage=30, stale-while-revalidate=60',
  insights: 'public, s-maxage=3600',
};

export interface ApiMeta {
  cached: boolean;
  latency_ms: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  success: false;
  error: string;
  meta: ApiMeta;
}

export function jsonOk<T>(
  data: T,
  latencyMs: number,
  cacheProfile: CacheProfile,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { cached: false, latency_ms: latencyMs },
    },
    {
      headers: {
        'Cache-Control': CACHE_HEADERS[cacheProfile],
      },
    },
  );
}

export function jsonError(
  message: string,
  status: 400 | 404 | 405 | 500,
  latencyMs: number,
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      meta: { cached: false, latency_ms: latencyMs },
    },
    { status },
  );
}

export async function withCricketHandler<T>(
  handler: () => Promise<T>,
  options: {
    cacheProfile: CacheProfile;
    notFoundMessage?: string;
  },
): Promise<NextResponse> {
  const started = Date.now();

  try {
    const data = await handler();
    const latencyMs = Date.now() - started;

    if (data === null || data === undefined) {
      return jsonError(options.notFoundMessage ?? 'Not found', 404, latencyMs);
    }

    return jsonOk(data, latencyMs, options.cacheProfile);
  } catch (error) {
    const latencyMs = Date.now() - started;
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    if (message.startsWith('Invalid ') || message.includes('required')) {
      return jsonError(message, 400, latencyMs);
    }

    console.error('[cricket-api]', error);
    return jsonError('Internal server error', 500, latencyMs);
  }
}

export function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Method not allowed', meta: { cached: false, latency_ms: 0 } },
    { status: 405 },
  );
}
