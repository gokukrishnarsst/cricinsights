import { getReadPool } from '@cricket-ai/database';
import type { LeagueComparisonData, LeagueComparisonMetric } from '@/types/cricket';

interface LeagueAgg {
  name: string;
  matches: number;
  runs: number;
  balls: number;
  sixes: number;
  fours: number;
  wickets: number;
  strikeRate: number;
  economy: number;
  boundaryPct: number;
  avgFirstInnings: number;
}

function shortLeagueName(name: string): string {
  const map: Record<string, string> = {
    'Indian Premier League': 'IPL',
    'Big Bash League': 'BBL',
    'Pakistan Super League': 'PSL',
    'Caribbean Premier League': 'CPL',
    'Bangladesh Premier League': 'BPL',
    'The Hundred': '100',
  };
  if (map[name]) return map[name];
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

async function leagueAggregateFromDb(
  pool: Awaited<ReturnType<typeof getReadPool>>,
  leagueName: string,
): Promise<LeagueAgg | null> {
  const bat = await pool.query<Record<string, unknown>>(
    `SELECT
       COUNT(DISTINCT fb.fixture_id)::int AS matches,
       COALESCE(SUM(fb.runs_scored), 0)::int AS runs,
       COALESCE(SUM(fb.balls_faced), 0)::int AS balls,
       COALESCE(SUM(fb.sixes), 0)::int AS sixes,
       COALESCE(SUM(fb.fours), 0)::int AS fours
     FROM matches.fixture_batting fb
     JOIN matches.fixtures f ON f.sportmonks_id = fb.fixture_id
     JOIN master.leagues l ON l.sportmonks_id = f.league_id
     WHERE l.name = $1`,
    [leagueName],
  );

  const bowl = await pool.query<Record<string, unknown>>(
    `SELECT
       COALESCE(SUM(fw.wickets), 0)::int AS wickets,
       COALESCE(AVG(fw.economy_rate), 0)::float AS economy
     FROM matches.fixture_bowling fw
     JOIN matches.fixtures f ON f.sportmonks_id = fw.fixture_id
     JOIN master.leagues l ON l.sportmonks_id = f.league_id
     WHERE l.name = $1`,
    [leagueName],
  );

  const innings = await pool.query<Record<string, unknown>>(
    `SELECT COALESCE(AVG(fr.score), 0)::float AS avg_first_innings
     FROM matches.fixture_runs fr
     JOIN matches.fixtures f ON f.sportmonks_id = fr.fixture_id
     JOIN master.leagues l ON l.sportmonks_id = f.league_id
     WHERE l.name = $1 AND fr.inning = 1`,
    [leagueName],
  );

  const b = bat.rows[0] ?? {};
  const w = bowl.rows[0] ?? {};
  const i = innings.rows[0] ?? {};
  const runs = Number(b.runs ?? 0);
  const balls = Number(b.balls ?? 0);
  const matches = Number(b.matches ?? 0);

  if (matches === 0) return null;

  return {
    name: leagueName,
    matches,
    runs,
    balls,
    sixes: Number(b.sixes ?? 0),
    fours: Number(b.fours ?? 0),
    wickets: Number(w.wickets ?? 0),
    strikeRate: balls > 0 ? (runs / balls) * 100 : 0,
    economy: Number(w.economy ?? 0),
    boundaryPct:
      runs > 0
        ? ((Number(b.fours ?? 0) * 4 + Number(b.sixes ?? 0) * 6) / runs) * 100
        : 0,
    avgFirstInnings: Number(i.avg_first_innings ?? 0),
  };
}

function buildMetrics(a: LeagueAgg, b: LeagueAgg): LeagueComparisonMetric[] {
  return [
    {
      label: 'Avg Strike Rate',
      valueA: Math.round(a.strikeRate * 10) / 10,
      valueB: Math.round(b.strikeRate * 10) / 10,
    },
    {
      label: 'Boundary %',
      valueA: Math.round(a.boundaryPct * 10) / 10,
      valueB: Math.round(b.boundaryPct * 10) / 10,
      unit: '%',
    },
    {
      label: 'Bowling Economy',
      valueA: Math.round(a.economy * 100) / 100,
      valueB: Math.round(b.economy * 100) / 100,
    },
    {
      label: 'Avg 1st Innings',
      valueA: Math.round(a.avgFirstInnings * 10) / 10,
      valueB: Math.round(b.avgFirstInnings * 10) / 10,
      unit: 'runs',
    },
    {
      label: 'Fixture volume',
      valueA: a.matches,
      valueB: b.matches,
    },
    {
      label: 'Wickets per Match',
      valueA:
        a.matches > 0 ? Math.round((a.wickets / a.matches) * 10) / 10 : 0,
      valueB:
        b.matches > 0 ? Math.round((b.wickets / b.matches) * 10) / 10 : 0,
    },
  ];
}

/**
 * Compare IPL to the next-best populated T20 league in Aurora (skips empty leagues like The Hundred).
 */
export async function getLeagueComparisonForLanding(): Promise<LeagueComparisonData | null> {
  try {
    const pool = await getReadPool();

    const { rows: leagueRows } = await pool.query<{
      name: string;
      sportmonks_id: number;
      fixture_count: number;
    }>(
      `SELECT l.name, l.sportmonks_id, COUNT(f.sportmonks_id)::int AS fixture_count
       FROM master.leagues l
       JOIN matches.fixtures f ON f.league_id = l.sportmonks_id
       GROUP BY l.sportmonks_id, l.name
       HAVING COUNT(f.sportmonks_id) > 0
       ORDER BY fixture_count DESC`,
    );

    if (leagueRows.length < 2) return null;

    const iplRow =
      leagueRows.find(
        (row) =>
          row.name === 'Indian Premier League' || row.sportmonks_id === 1,
      ) ?? leagueRows[0];

    const partnerRow =
      leagueRows.find((row) => row.sportmonks_id !== iplRow.sportmonks_id) ??
      leagueRows[1];

    const [aggA, aggB] = await Promise.all([
      leagueAggregateFromDb(pool, iplRow.name),
      leagueAggregateFromDb(pool, partnerRow.name),
    ]);

    if (!aggA || !aggB) return null;

    const summary = `League comparison from verified match data: ${aggA.name} vs ${aggB.name}. Metrics aggregate batting, bowling, and innings totals from SportMonks silver tables.`;

    return {
      leagueAName: aggA.name,
      leagueBName: aggB.name,
      leagueAShort: shortLeagueName(aggA.name),
      leagueBShort: shortLeagueName(aggB.name),
      metrics: buildMetrics(aggA, aggB),
      summary,
    };
  } catch (error) {
    console.warn('[league-data] League comparison unavailable:', error);
    return null;
  }
}
