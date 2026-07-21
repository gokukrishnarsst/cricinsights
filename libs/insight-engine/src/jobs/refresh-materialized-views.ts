import type { Pool } from 'pg';
import { executeJob } from './job-utils.js';

const MATERIALIZED_VIEWS = [
  'insights.player_season_agg',
  'insights.venue_stats',
] as const;

/**
 * Refresh insights materialized views concurrently (requires unique indexes).
 */
export async function refreshMaterializedViews(pool: Pool) {
  return executeJob('refresh-views', pool, async (activePool) => {
    let refreshed = 0;

    for (const viewName of MATERIALIZED_VIEWS) {
      await activePool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);
      refreshed += 1;
    }

    return refreshed;
  });
}
