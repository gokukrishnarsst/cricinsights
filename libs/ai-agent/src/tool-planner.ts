export interface AgentRouteHint {
  intent?: string;
  confidence?: number;
  params?: Record<string, unknown>;
}

export interface AgentRequestContext {
  routeHint?: AgentRouteHint;
}

export interface ToolPlan {
  intent: string;
  allowedToolNames: string[];
  preferredToolNames: string[];
  maxToolCalls: number;
  maxToolUsesPerTurn: number;
  promptContext: string;
}

const INTENT_TOOLS: Record<string, string[]> = {
  player_stats: ['get_player_stats'],
  player_scout: ['get_player_stats', 'get_player_match_history', 'get_ball_analysis'],
  player_match_history: ['search_cricket_entities', 'get_player_match_history'],
  player_compare: ['compare_entities', 'search_cricket_entities'],
  matchup: ['compare_entities', 'search_cricket_entities'],
  head_to_head: ['compare_entities'],
  league_standings: ['search_cricket_entities', 'get_league_data'],
  league_winner: ['search_cricket_entities', 'get_league_data'],
  leaderboard: ['search_cricket_entities', 'get_league_data'],
  match_scorecard: ['get_match_data'],
  team_fixtures: ['get_fixtures'],
  match_context: ['search_cricket_entities', 'get_match_context', 'get_match_data', 'get_fixtures'],
  ball_analysis: ['get_ball_analysis', 'search_cricket_entities'],
  team_analytics: ['search_cricket_entities', 'get_team_analytics'],
  venue_stats: ['search_cricket_entities', 'get_venue_stats'],
  team_rankings: ['get_rankings'],
  trend_analysis: ['get_trends', 'search_cricket_entities'],
  live_score: ['get_live_match_state', 'search_cricket_entities'],
  entity_lookup: ['search_cricket_entities'],
  dismissal_analysis: ['get_ball_analysis', 'search_cricket_entities'],
};

const GENERAL_RESEARCH_TOOLS = [
  'search_cricket_entities',
  'get_player_stats',
  'get_team_data',
  'get_fixtures',
  'get_league_data',
  'get_match_data',
  'compare_entities',
];

export function createToolPlan(
  query: string,
  context: AgentRequestContext = {},
): ToolPlan {
  const intent = context.routeHint?.intent ?? inferIntent(query);
  const preferredToolNames = INTENT_TOOLS[intent] ?? GENERAL_RESEARCH_TOOLS;
  const allowedToolNames = unique(preferredToolNames);
  const maxToolCalls = readBoundedEnv('AGENT_MAX_TOOL_CALLS', 4, 1, 6);
  const maxToolUsesPerTurn = readBoundedEnv('AGENT_MAX_TOOL_USES_PER_TURN', 2, 1, 3);
  const routeParams = context.routeHint?.params;
  const hint = routeParams && Object.keys(routeParams).length
    ? JSON.stringify(routeParams)
    : 'none';

  return {
    intent,
    allowedToolNames,
    preferredToolNames,
    maxToolCalls,
    maxToolUsesPerTurn,
    promptContext: [
      '## Deterministic tool plan',
      `- Classified intent: ${intent}`,
      `- Router hints: ${hint}`,
      `- Allowed tools for this turn: ${allowedToolNames.join(', ')}`,
      `- Preferred order: ${preferredToolNames.join(' → ')}`,
      `- Hard budget: at most ${maxToolCalls} total calls and ${maxToolUsesPerTurn} calls per model turn.`,
      '- Call a single tool when it can answer the question. Call two tools in parallel only when their results are independent.',
      '- Never repeat the same tool with the same input. If an ID is absent, use a name-capable tool before an ID-only tool.',
      '- For scorecards with two named teams, call get_match_data once with team_a_name, team_b_name, and any known year, match_format, or league_name. Its not_found or ambiguous result is terminal: return it instead of trying another tool.',
      '- Once the available result answers the question, immediately produce the final JSON manifest; do not call a confirmation tool.',
    ].join('\n'),
  };
}

function inferIntent(query: string): string {
  const text = query.toLowerCase();
  if (/\b(live|right now|latest score|last over)\b/.test(text)) return 'live_score';
  if (/\b(ranking|rating|icc)\b/.test(text)) return 'team_rankings';
  if (/\b(powerplay|power play|death overs?|middle overs?|phase|ball.by.ball)\b/.test(text)) return 'ball_analysis';
  if (/\b(lineup|playing xi|officials?|umpires?|weather|extras|odds)\b/.test(text)) return 'match_context';
  if (/\b(scorecard|full score)\b/.test(text)) return 'match_scorecard';
  if (/\b(last \d+|recent|match.by.match|innings history)\b/.test(text)) return 'player_match_history';
  if (/\b(venue|ground|stadium)\b/.test(text)) return 'venue_stats';
  if (/\b(over the years|year.on.year|season.on.season|trend)\b/.test(text)) return 'trend_analysis';
  if (/\b(standings|points table|league table)\b/.test(text)) return 'league_standings';
  if (/\b(who won|winner|champions?|title winners?)\b/.test(text)) return 'league_winner';
  if (/\b(leaderboard|top run|top wicket|orange cap|purple cap)\b/.test(text)) return 'leaderboard';
  if (/\b(head.to.head|h2h)\b/.test(text)) return 'head_to_head';
  if (/\b(compare| versus |\bvs\.?\b)\b/.test(text)) return 'player_compare';
  if (/\b(stats|statistics|career|batting|bowling)\b/.test(text)) return 'player_stats';
  return 'unknown';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function readBoundedEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Number(process.env[name]?.trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}
