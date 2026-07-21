import {
  resolveSeasonForLeague as resolveSeasonFromDb,
  searchCricketEntities,
} from '@cricket-ai/database';

/** Parse a 4-digit year from natural language (e.g. "IPL 2024 standings"). */
export function extractSeasonYearFromText(text: string): string | undefined {
  const match = text.match(/\b(20\d{2})\b/);
  return match?.[1];
}

/**
 * Resolve SportMonks season_id for league standings / leaderboards.
 * Uses the local database (active season / year match).
 */
export async function resolveLeagueSeasonId(
  leagueId: number,
  queryText: string,
  existingSeasonId?: unknown,
): Promise<number> {
  if (existingSeasonId !== undefined && existingSeasonId !== null) {
    const n = Number(existingSeasonId);
    if (Number.isFinite(n)) return n;
  }

  const year = extractSeasonYearFromText(queryText);
  return resolveSeasonFromDb(leagueId, year);
}

/**
 * Resolve a human competition name to one league and one season from the local
 * database. A gender marker is honoured; otherwise a men's competition wins
 * over a women's namesake, matching the conventional unqualified query.
 */
export async function resolveLeagueSeasonByName(params: {
  leagueName: string;
  queryText: string;
  existingSeasonId?: unknown;
}): Promise<{ leagueId: number; seasonId: number }> {
  const leagueName = params.leagueName.trim();
  if (!leagueName) throw new Error('A competition name is required');

  const matches = await searchCricketEntities({
    entity_type: 'league',
    query: leagueName,
    limit: 10,
  });
  const requestedWomen = /\bwomen'?s?\b/i.test(params.queryText);
  const requestedMen = /\bmen'?s?\b/i.test(params.queryText);
  const candidates = matches.filter((row) => {
    const name = String(row.name ?? '').toLowerCase();
    if (requestedWomen) return /women/.test(name);
    if (requestedMen) return /men/.test(name);
    return !/women/.test(name);
  });
  const candidate = candidates[0] ?? matches[0];
  const leagueId = Number(candidate?.id);
  if (!Number.isInteger(leagueId) || leagueId <= 0) {
    throw new Error(`No competition found matching "${leagueName}"`);
  }

  return {
    leagueId,
    seasonId: await resolveLeagueSeasonId(
      leagueId,
      params.queryText,
      params.existingSeasonId,
    ),
  };
}
