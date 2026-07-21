import { getReadPool } from '../client.js';
import type { SportmonksId } from '../types/cricket.js';
import { toInt } from '../types/cricket.js';

/**
 * Resolve a season SportMonks ID for a league, optionally matching a calendar year in `name`.
 */
export async function resolveSeasonForLeague(
  leagueId: SportmonksId,
  yearHint?: string | number,
): Promise<number> {
  const pool = await getReadPool();
  const year =
    yearHint !== undefined && yearHint !== null
      ? String(yearHint).replace(/\D/g, '').slice(0, 4)
      : '';

  if (year.length === 4) {
    const { rows } = await pool.query<Record<string, unknown>>(
      `SELECT sportmonks_id
       FROM master.seasons
       WHERE league_id = $1 AND is_active = true AND name = $2
       ORDER BY sportmonks_id DESC
       LIMIT 1`,
      [leagueId, year],
    );
    const id = rows[0] ? toInt(rows[0].sportmonks_id) : null;
    if (id) return id;
  }

  const { rows: leagueRows } = await pool.query<Record<string, unknown>>(
    `SELECT active_season_id FROM master.leagues WHERE sportmonks_id = $1`,
    [leagueId],
  );
  const active = leagueRows[0] ? toInt(leagueRows[0].active_season_id) : null;
  if (active) return active;

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT sportmonks_id
     FROM master.seasons
     WHERE league_id = $1 AND is_active = true
     ORDER BY sportmonks_id DESC
     LIMIT 1`,
    [leagueId],
  );
  const latest = rows[0] ? toInt(rows[0].sportmonks_id) : null;
  if (!latest) {
    throw new Error(`No season found for league ${leagueId}`);
  }
  return latest;
}
