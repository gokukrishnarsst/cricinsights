/** Supported fast-path intent labels for routing and UI templates. */
export type FastPathIntent =
  | 'player_stats'
  | 'player_scout'
  | 'head_to_head'
  | 'league_standings'
  | 'league_winner'
  | 'match_scorecard'
  | 'team_fixtures'
  | 'leaderboard'
  | 'player_compare'
  | 'matchup'
  | 'dismissal_analysis'
  | 'entity_lookup'
  | 'player_match_history'
  | 'match_context'
  | 'ball_analysis'
  | 'team_analytics'
  | 'venue_stats'
  | 'team_rankings'
  | 'trend_analysis'
  | 'live_score'
  | 'unknown';

export type RoutePath = 'fast_path' | 'ai_path';

export interface RouteDecision {
  route: RoutePath;
  intent: FastPathIntent;
  confidence: number;
  /** Normalized parameters extracted from the user query (names, ids, league hints). */
  params: Record<string, unknown>;
}

export interface FastPathResult {
  intent: FastPathIntent;
  toolName: string;
  payload: Record<string, unknown>;
}
