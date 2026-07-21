import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { executeJob, log } from './job-utils.js';

type LeaderboardKind =
  | 'top_run_scorers'
  | 'top_wicket_takers'
  | 'best_strike_rate'
  | 'best_economy';

interface SeasonRef {
  season_id: string;
  league_id: string;
  season_name: string;
  league_name: string;
}

interface LeaderboardRow {
  rank: number;
  player_id: string;
  player_name: string;
  format_type: string | null;
  value: number;
}

const LEADERBOARD_LIMIT = 20;

const LEADERBOARD_QUERIES: Record<
  LeaderboardKind,
  { metric: string; sql: string }
> = {
  top_run_scorers: {
    metric: 'batting_runs',
    sql: `
      SELECT pcs.player_id, p.fullname AS player_name, pcs.format_type,
             pcs.batting_runs AS metric_value,
             ROW_NUMBER() OVER (
               ORDER BY pcs.batting_runs DESC NULLS LAST, p.fullname
             ) AS rank
      FROM master.player_career_stats pcs
      JOIN master.players p ON p.sportmonks_id = pcs.player_id
      WHERE pcs.season_id = $1
        AND pcs.batting_runs IS NOT NULL
      ORDER BY pcs.batting_runs DESC NULLS LAST, p.fullname
      LIMIT $2`,
  },
  top_wicket_takers: {
    metric: 'bowling_wickets',
    sql: `
      SELECT pcs.player_id, p.fullname AS player_name, pcs.format_type,
             pcs.bowling_wickets AS metric_value,
             ROW_NUMBER() OVER (
               ORDER BY pcs.bowling_wickets DESC NULLS LAST, p.fullname
             ) AS rank
      FROM master.player_career_stats pcs
      JOIN master.players p ON p.sportmonks_id = pcs.player_id
      WHERE pcs.season_id = $1
        AND pcs.bowling_wickets IS NOT NULL
      ORDER BY pcs.bowling_wickets DESC NULLS LAST, p.fullname
      LIMIT $2`,
  },
  best_strike_rate: {
    metric: 'batting_strike_rate',
    sql: `
      SELECT pcs.player_id, p.fullname AS player_name, pcs.format_type,
             pcs.batting_strike_rate AS metric_value,
             ROW_NUMBER() OVER (
               ORDER BY pcs.batting_strike_rate DESC NULLS LAST, p.fullname
             ) AS rank
      FROM master.player_career_stats pcs
      JOIN master.players p ON p.sportmonks_id = pcs.player_id
      WHERE pcs.season_id = $1
        AND pcs.batting_strike_rate IS NOT NULL
        AND COALESCE(pcs.batting_balls_faced, 0) >= 100
      ORDER BY pcs.batting_strike_rate DESC NULLS LAST, p.fullname
      LIMIT $2`,
  },
  best_economy: {
    metric: 'bowling_economy_rate',
    sql: `
      SELECT pcs.player_id, p.fullname AS player_name, pcs.format_type,
             pcs.bowling_economy_rate AS metric_value,
             ROW_NUMBER() OVER (
               ORDER BY pcs.bowling_economy_rate ASC NULLS LAST, p.fullname
             ) AS rank
      FROM master.player_career_stats pcs
      JOIN master.players p ON p.sportmonks_id = pcs.player_id
      WHERE pcs.season_id = $1
        AND pcs.bowling_economy_rate IS NOT NULL
        AND COALESCE(pcs.bowling_overs, 0) >= 10
      ORDER BY pcs.bowling_economy_rate ASC NULLS LAST, p.fullname
      LIMIT $2`,
  },
};

function hashManifest(manifest: unknown): string {
  return createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
}

async function fetchActiveSeasons(pool: Pool): Promise<SeasonRef[]> {
  const { rows } = await pool.query<SeasonRef>(
    `SELECT s.sportmonks_id::text AS season_id,
            s.league_id::text AS league_id,
            s.name AS season_name,
            l.name AS league_name
     FROM master.seasons s
     JOIN master.leagues l ON l.sportmonks_id = s.league_id
     WHERE s.is_active = true
       AND l.is_active = true
     ORDER BY s.league_id, s.sportmonks_id`,
  );
  return rows;
}

async function upsertLeaderboardInsight(
  pool: Pool,
  season: SeasonRef,
  kind: LeaderboardKind,
  entries: LeaderboardRow[],
): Promise<void> {
  const manifest = {
    component: 'Leaderboard',
    data: {
      kind,
      leagueId: Number(season.league_id),
      seasonId: Number(season.season_id),
      leagueName: season.league_name,
      seasonName: season.season_name,
      metric: LEADERBOARD_QUERIES[kind].metric,
      entries,
    },
  };

  const insightKey = `${season.league_id}:${season.season_id}:${kind}`;
  const dataHash = hashManifest(manifest);

  await pool.query(
    `INSERT INTO insights.pre_computed_insights (
       insight_type, insight_key, ui_manifest, narrative, data_hash, computed_at, expires_at
     )
     VALUES ($1, $2, $3::jsonb, $4, $5, now(), now() + interval '7 days')
     ON CONFLICT (insight_type, insight_key) DO UPDATE SET
       ui_manifest = EXCLUDED.ui_manifest,
       narrative = EXCLUDED.narrative,
       data_hash = EXCLUDED.data_hash,
       computed_at = EXCLUDED.computed_at,
       expires_at = EXCLUDED.expires_at`,
    [
      'leaderboard',
      insightKey,
      JSON.stringify(manifest),
      `${kind.replaceAll('_', ' ')} for ${season.league_name} ${season.season_name}`,
      dataHash,
    ],
  );
}

/**
 * Generate leaderboard UI manifests per league/season and store in pre_computed_insights.
 */
export async function computeLeaderboards(pool: Pool) {
  return executeJob('leaderboards', pool, async (activePool) => {
    const seasons = await fetchActiveSeasons(activePool);
    let rowsAffected = 0;

    for (const season of seasons) {
      for (const kind of Object.keys(LEADERBOARD_QUERIES) as LeaderboardKind[]) {
        const { rows } = await activePool.query<{
          player_id: string;
          player_name: string;
          format_type: string | null;
          metric_value: string;
          rank: string;
        }>(LEADERBOARD_QUERIES[kind].sql, [season.season_id, LEADERBOARD_LIMIT]);

        const entries: LeaderboardRow[] = rows.map((row) => ({
          rank: Number(row.rank),
          player_id: row.player_id,
          player_name: row.player_name,
          format_type: row.format_type,
          value: Number(row.metric_value),
        }));

        await upsertLeaderboardInsight(activePool, season, kind, entries);
        rowsAffected += 1;
        log(
          `Stored leaderboard ${kind} for league ${season.league_id} season ${season.season_id} (${entries.length} entries)`,
        );
      }
    }

    return rowsAffected;
  });
}
