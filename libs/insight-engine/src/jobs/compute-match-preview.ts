import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { executeJob, log } from './job-utils.js';

const UPCOMING_FIXTURES_SQL = `
SELECT
  f.sportmonks_id::text AS fixture_id,
  f.league_id::text AS league_id,
  f.season_id::text AS season_id,
  f.match_format,
  f.starting_at,
  f.status,
  f.venue_id::text AS venue_id,
  lt.name AS localteam_name,
  vt.name AS visitorteam_name,
  v.name AS venue_name,
  v.city AS venue_city
FROM matches.fixtures f
JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
LEFT JOIN master.venues v ON v.sportmonks_id = f.venue_id
WHERE f.is_active = true
  AND f.starting_at IS NOT NULL
  AND f.starting_at >= now()
  AND f.starting_at <= now() + interval '14 days'
  AND (
    f.status IS NULL
    OR f.status IN ('NS', 'TBD', 'Scheduled', 'scheduled', 'Not Started')
    OR f.status ILIKE '%upcoming%'
  )
ORDER BY f.starting_at ASC
LIMIT 200;
`;

interface UpcomingFixture {
  fixture_id: string;
  league_id: string;
  season_id: string;
  match_format: string | null;
  starting_at: Date | string;
  status: string | null;
  venue_id: string | null;
  localteam_name: string;
  visitorteam_name: string;
  venue_name: string | null;
  venue_city: string | null;
}

function hashManifest(manifest: unknown): string {
  return createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
}

function buildPreviewNarrative(fixture: UpcomingFixture): string {
  const when = new Date(fixture.starting_at).toISOString();
  const venue = fixture.venue_name ?? 'TBD venue';
  return `${fixture.localteam_name} vs ${fixture.visitorteam_name} at ${venue} on ${when}.`;
}

/**
 * Generate match preview insights for upcoming fixtures.
 */
export async function computeMatchPreview(pool: Pool) {
  return executeJob('match-preview', pool, async (activePool) => {
    const { rows } = await activePool.query<UpcomingFixture>(UPCOMING_FIXTURES_SQL);
    let rowsAffected = 0;

    for (const fixture of rows) {
      const manifest = {
        component: 'MatchPreview',
        data: {
          fixtureId: Number(fixture.fixture_id),
          leagueId: Number(fixture.league_id),
          seasonId: Number(fixture.season_id),
          matchFormat: fixture.match_format,
          startingAt: new Date(fixture.starting_at).toISOString(),
          status: fixture.status,
          venue: {
            id: fixture.venue_id ? Number(fixture.venue_id) : null,
            name: fixture.venue_name,
            city: fixture.venue_city,
          },
          teams: {
            home: fixture.localteam_name,
            away: fixture.visitorteam_name,
          },
        },
      };

      const insightKey = fixture.fixture_id;
      const dataHash = hashManifest(manifest);

      await activePool.query(
        `INSERT INTO insights.pre_computed_insights (
           insight_type, insight_key, ui_manifest, narrative, data_hash, computed_at, expires_at
         )
         VALUES ($1, $2, $3::jsonb, $4, $5, now(), $6::timestamptz + interval '1 day')
         ON CONFLICT (insight_type, insight_key) DO UPDATE SET
           ui_manifest = EXCLUDED.ui_manifest,
           narrative = EXCLUDED.narrative,
           data_hash = EXCLUDED.data_hash,
           computed_at = EXCLUDED.computed_at,
           expires_at = EXCLUDED.expires_at`,
        [
          'match_preview',
          insightKey,
          JSON.stringify(manifest),
          buildPreviewNarrative(fixture),
          dataHash,
          new Date(fixture.starting_at).toISOString(),
        ],
      );

      rowsAffected += 1;
    }

    log(`Stored ${rowsAffected} match preview insights`);
    return rowsAffected;
  });
}
