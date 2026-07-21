import { getReadPool } from '@cricket-ai/database';
import { optionalQuery } from '@/lib/api/cricket-params';
import {
  methodNotAllowed,
  withCricketHandler,
} from '@/lib/api/cricket-response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const insightType = optionalQuery(searchParams, 'type');
  const insightKey = optionalQuery(searchParams, 'key');

  if (!insightType || !insightKey) {
    return withCricketHandler(
      async () => {
        if (!insightType) {
          throw new Error('Invalid query parameter: type is required');
        }
        throw new Error('Invalid query parameter: key is required');
      },
      { cacheProfile: 'insights' },
    );
  }

  return withCricketHandler(
    async () => {
      const pool = await getReadPool();
      const { rows } = await pool.query<{
        insight_type: string;
        insight_key: string;
        ui_manifest: unknown;
        narrative: string | null;
        computed_at: Date | string | null;
        expires_at: Date | string | null;
        view_count: number;
      }>(
        `SELECT insight_type, insight_key, ui_manifest, narrative,
                computed_at, expires_at, view_count
         FROM insights.pre_computed_insights
         WHERE insight_type = $1 AND insight_key = $2
           AND (expires_at IS NULL OR expires_at > now())
         LIMIT 1`,
        [insightType, insightKey],
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];

      await pool.query(
        `UPDATE insights.pre_computed_insights
         SET view_count = view_count + 1
         WHERE insight_type = $1 AND insight_key = $2`,
        [insightType, insightKey],
      );

      return {
        insightType: row.insight_type,
        insightKey: row.insight_key,
        manifest:
          typeof row.ui_manifest === 'object' && row.ui_manifest !== null
            ? row.ui_manifest
            : { raw: row.ui_manifest },
        narrative: row.narrative,
        computedAt: row.computed_at ? String(row.computed_at) : null,
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        viewCount: row.view_count + 1,
      };
    },
    {
      cacheProfile: 'insights',
      notFoundMessage: `Insight not found for type="${insightType}" key="${insightKey}"`,
    },
  );
}

export function POST() {
  return methodNotAllowed();
}
