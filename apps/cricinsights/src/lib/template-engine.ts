import type { FastPathIntent } from '@cricket-ai/smart-router';
import type { FastPathResult } from '@cricket-ai/smart-router';
import type { ComparisonCardData } from '@/components/generative-ui/types';
import {
  enrichPlayerComparisonData,
  formatComparisonNarrative,
} from '@/lib/player-compare';
import {
  coalesceStatsTableRows,
  normalizeStatsRow,
  normalizeStatsTableData,
} from '@/lib/stats-table-normalize';
import { normalizeLeaderboardTableData } from '@/lib/leaderboard-normalize';
import { buildPlayerScoutManifest } from '@/lib/player-scout';
import {
  buildDismissalStatsTables,
  dismissalNarrative,
} from '@/lib/dismissal-table';
import { hydrateManifestFromToolCalls, isValidComparisonCardData } from '@/lib/manifest-hydrate';

export interface UIComponent {
  type: string;
  data: Record<string, unknown>;
}

export interface ChatManifest {
  components: UIComponent[];
  narrative: string;
  shareable: boolean;
}

/** Map fast-path tool payloads to Generative UI component manifests. */
export function buildManifestFromFastPath(result: FastPathResult): ChatManifest {
  switch (result.intent) {
    case 'player_stats':
      return buildPlayerStatsManifest(result.payload);
    case 'player_scout':
      return buildPlayerScoutManifestFromFastPath(result.payload);
    case 'player_compare':
      return buildPlayerCompareManifest(result.payload);
    case 'matchup':
      return buildMatchupManifest(result.payload);
    case 'league_standings':
      return buildLeagueStandingsManifest(result.payload);
    case 'league_winner':
      return buildLeagueWinnerManifest(result.payload);
    case 'leaderboard':
      return buildLeaderboardManifest(result.payload);
    case 'match_scorecard':
      return buildScorecardManifest(result.payload);
    case 'player_match_history':
      return buildPlayerMatchHistoryManifest(result.payload);
    case 'team_fixtures':
      return buildTeamFixturesManifest(result.payload);
    case 'head_to_head':
      return buildHeadToHeadManifest(result.payload);
    case 'dismissal_analysis':
      return buildDismissalAnalysisManifest(result.payload);
    default:
      return wrapPayloadManifest(result.intent, result.payload);
  }
}

/** Normalize AI agent components into the chat manifest shape. */
export function buildManifestFromAgent(params: {
  components: UIComponent[];
  narrative: string;
  toolCalls?: Array<{
    toolName: string;
    output?: Record<string, unknown>;
    error?: string;
  }>;
}): ChatManifest {
  let components = params.components.map(normalizeComponent);
  const sharedCareerStats = extractManifestCareerStats(components);
  if (sharedCareerStats.length > 0) {
    components = components.map((component) =>
      hydrateStatsTableFromCareerStats(component, sharedCareerStats),
    );
  }

  if (params.toolCalls?.length) {
    const hydrated = hydrateManifestFromToolCalls(
      components,
      params.narrative,
      params.toolCalls,
    );
    components = hydrated.components.map(normalizeComponent);
    return {
      components: dropInvalidComparisonCards(components),
      narrative: hydrated.narrative,
      shareable: components.length > 0,
    };
  }

  return {
    components: dropInvalidComparisonCards(components),
    narrative: params.narrative,
    shareable: components.length > 0,
  };
}

function dropInvalidComparisonCards(components: UIComponent[]): UIComponent[] {
  return components.filter((c) => {
    if (c.type !== 'comparison_card') return true;
    return isValidComparisonCardData(c.data ?? {});
  });
}

function buildPlayerScoutManifestFromFastPath(
  payload: Record<string, unknown>,
): ChatManifest {
  const built = buildPlayerScoutManifest(payload);
  return {
    components: built.components.map((c) => normalizeComponent(c)),
    narrative: built.narrative,
    shareable: true,
  };
}

function buildPlayerStatsManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const profile = data.profile as Record<string, unknown> | undefined;
  const name =
    typeof profile?.fullname === 'string' ? profile.fullname : 'Player';

  return {
    components: [
      { type: 'player_card', data: { profile, highlights: data.highlights } },
      {
        type: 'stats_table',
        data: {
          title: `${name} career stats`,
          rows: data.careerStats ?? [],
          filters: data.filters ?? {},
        },
      },
    ],
    narrative: `${name} profile and career statistics from SportMonks / CricInsights.`,
    shareable: true,
  };
}

function buildPlayerCompareManifest(payload: Record<string, unknown>): ChatManifest {
  const raw = (payload.data as Record<string, unknown>) ?? payload;
  const comparisonData = raw as ComparisonCardData;
  const enriched = enrichPlayerComparisonData(comparisonData);
  const data: Record<string, unknown> = {
    ...comparisonData,
    ...(enriched ? { enriched } : {}),
  };

  const components: UIComponent[] = [{ type: 'comparison_card', data }];

  const series = data.metrics ?? data.careerComparison;
  if (Array.isArray(series) && series.length > 0) {
    components.push({
      type: 'trend_chart',
      data: {
        title: 'Season trends',
        series,
      },
    });
  }

  const narrative = enriched
    ? formatComparisonNarrative(enriched)
    : 'Head-to-head player comparison from verified database records.';

  return {
    components,
    narrative,
    shareable: true,
  };
}

function buildMatchupManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;

  return {
    components: [
      { type: 'matchup_card', data },
      {
        type: 'stats_table',
        data: {
          title: 'Matchup breakdown',
          rows: data.matchupStats ?? data.rows ?? [],
        },
      },
    ],
    narrative: 'Batsman vs bowler matchup statistics from ball-by-ball data.',
    shareable: true,
  };
}

function buildLeagueStandingsManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const tableData = normalizeLeaderboardTableData({
    title: 'League standings',
    rows: data.standings ?? data.rows ?? data,
  });

  return {
    components: [
      {
        type: 'leaderboard_table',
        data: tableData,
      },
    ],
    narrative: 'Current league points table from SportMonks / CricInsights.',
    shareable: true,
  };
}

function buildLeagueWinnerManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const winnerName = typeof data.winnerName === 'string' ? data.winnerName : null;
  const seasonYear = typeof data.seasonYear === 'string' ? data.seasonYear : null;
  return {
    components: [],
    narrative: winnerName
      ? `${winnerName} won ${seasonYear ? `the ${seasonYear} ` : 'that season\'s '}title.`
      : `No completed final was found${seasonYear ? ` for the ${seasonYear} season` : ''}.`,
    shareable: Boolean(winnerName),
  };
}

function buildLeaderboardManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const tableData = normalizeLeaderboardTableData({
    title: 'Leaderboard',
    rows: data.leaderboard ?? data.rows ?? data,
    metric: data.metric ?? null,
  });

  return {
    components: [
      {
        type: 'leaderboard_table',
        data: tableData,
      },
    ],
    narrative: 'Season leaderboard rankings from verified league data.',
    shareable: true,
  };
}

function buildScorecardManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;

  if (payload.component === 'DataAvailability' || data.status === 'not_found' || data.status === 'ambiguous') {
    const message = typeof data.message === 'string'
      ? data.message
      : 'No matching scorecard was found in the CricInsights database.';
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    return {
      components: [
        {
          type: 'insight_card',
          data: {
            title: data.status === 'ambiguous' ? 'More match details needed' : 'No matching data found',
            content: message,
            severity: 'info',
            ...(candidates.length ? { candidates } : {}),
          },
        },
      ],
      narrative: message,
      shareable: false,
    };
  }

  return {
    components: [{ type: 'scorecard_view', data }],
    narrative: 'Full match scorecard with batting and bowling summaries.',
    shareable: true,
  };
}

function buildPlayerMatchHistoryManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const player = (data.player as Record<string, unknown> | undefined) ?? {};
  const rows = Array.isArray(data.batting) ? data.batting as Array<Record<string, unknown>> : [];
  const playerName = typeof player.name === 'string' ? player.name : 'Player';
  const runs = rows.reduce((total, row) => total + numberValue(row.runs_scored), 0);
  const balls = rows.reduce((total, row) => total + numberValue(row.balls_faced), 0);
  const dismissals = rows.filter((row) => row.was_dismissed === true).length;
  const average = dismissals > 0 ? runs / dismissals : null;
  const strikeRate = balls > 0 ? (runs / balls) * 100 : null;
  const chronological = [...rows].reverse();

  return {
    components: [
      {
        type: 'insight_card',
        data: {
          title: `${playerName}: last ${rows.length} completed matches`,
          content: `${runs} runs, ${average === null ? '—' : average.toFixed(2)} average, ${strikeRate === null ? '—' : strikeRate.toFixed(2)} strike rate.`,
          severity: 'info',
        },
      },
      {
        type: 'stats_table',
        data: {
          title: 'Match-by-match batting',
          rows: rows.map((row) => ({
            date: row.match_date ?? null,
            opponent: row.opponent_name ?? null,
            league: row.league_name ?? null,
            runs: numberValue(row.runs_scored),
            balls: numberValue(row.balls_faced),
            fours: numberValue(row.fours),
            sixes: numberValue(row.sixes),
            strikeRate: numberValue(row.strike_rate),
          })),
        },
      },
      {
        type: 'trend_chart',
        data: {
          title: 'Runs trend',
          series: chronological.map((row, index) => ({
            label: String(row.match_date ?? `Match ${index + 1}`),
            value: numberValue(row.runs_scored),
          })),
        },
      },
    ],
    narrative: rows.length > 0
      ? `${playerName} scored ${runs} runs in the latest ${rows.length} completed matches, averaging ${average === null ? '—' : average.toFixed(2)} at a strike rate of ${strikeRate === null ? '—' : strikeRate.toFixed(2)}.`
      : `No completed match history was found for ${playerName} in the requested database scope.`,
    shareable: rows.length > 0,
  };
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildTeamFixturesManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const fixtures = Array.isArray(data.fixtures)
    ? data.fixtures
    : Array.isArray(data.rows)
      ? data.rows
      : [];

  return {
    components: [{ type: 'match_preview_card', data: { fixtures } }],
    narrative: 'Fixtures and recent results from SportMonks / CricInsights.',
    shareable: true,
  };
}

function buildHeadToHeadManifest(payload: Record<string, unknown>): ChatManifest {
  const data = (payload.data as Record<string, unknown>) ?? payload;

  return {
    components: [
      { type: 'comparison_card', data: { ...data, comparisonType: 'team_vs_team' } },
      {
        type: 'h2h_stats_table',
        data: {
          title: 'Head-to-head record',
          rows: data.fixtures ?? data.history ?? [],
        },
      },
    ],
    narrative: 'Team head-to-head record across recent fixtures.',
    shareable: true,
  };
}

function buildDismissalAnalysisManifest(
  payload: Record<string, unknown>,
): ChatManifest {
  const tables = buildDismissalStatsTables(payload);
  return {
    components: tables,
    narrative: dismissalNarrative(payload),
    shareable: tables.length > 0,
  };
}

function wrapPayloadManifest(
  intent: FastPathIntent,
  payload: Record<string, unknown>,
): ChatManifest {
  const componentType = typeof payload.component === 'string'
    ? camelToSnake(payload.component)
    : intent;

  return {
    components: [
      {
        type: componentType,
        data: (payload.data as Record<string, unknown>) ?? payload,
      },
    ],
    narrative: `Results for ${intent.replace(/_/g, ' ')}.`,
    shareable: true,
  };
}

function normalizeComponent(component: UIComponent): UIComponent {
  const type = camelToSnake(component.type);
  let data = component.data ?? {};

  if (type === 'stats_table' || type === 'h2h_stats_table') {
    data = normalizeStatsTableData(data);
  } else if (type === 'leaderboard_table') {
    data = normalizeLeaderboardTableData(data);
  }

  return {
    type,
    data,
  };
}

function extractManifestCareerStats(
  components: UIComponent[],
): Array<Record<string, unknown>> {
  for (const component of components) {
    const data = component.data ?? {};
    const fromPlayer = data.careerStats ?? data.career_stats;
    if (Array.isArray(fromPlayer) && fromPlayer.length > 0) {
      return fromPlayer as Array<Record<string, unknown>>;
    }
  }
  return [];
}

function statsRowHasValues(row: Record<string, unknown>): boolean {
  const normalized = normalizeStatsRow(row);
  const keys = [
    'seasonName',
    'battingRuns',
    'battingAverage',
    'battingStrikeRate',
    'bowlingWickets',
    'bowlingEconomyRate',
  ] as const;
  return keys.some((key) => {
    const value = normalized[key];
    return value !== null && value !== undefined && value !== '';
  });
}

function hydrateStatsTableFromCareerStats(
  component: UIComponent,
  careerStats: Array<Record<string, unknown>>,
): UIComponent {
  const type = component.type;
  if (type !== 'stats_table' && type !== 'h2h_stats_table') {
    return component;
  }

  const rows = coalesceStatsTableRows(component.data ?? {});
  const usable =
    rows.length > 0 && rows.some((row) => statsRowHasValues(row));
  if (usable) return component;

  return {
    ...component,
    data: normalizeStatsTableData({
      ...(component.data ?? {}),
      careerStats,
    }),
  };
}

function camelToSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}
