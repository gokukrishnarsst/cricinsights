/** Canonical chat scenarios for regression / weakness discovery. */

export type EvalLayer = 'router' | 'fast_path' | 'manifest';

export interface EvalScenario {
  id: string;
  query: string;
  /** What we expect from SmartRouter when rules are healthy. */
  expectRoute?: 'fast_path' | 'ai_path';
  expectIntent?: string;
  /** Components that should appear after fast-path manifest build. */
  expectComponents?: string[];
  /** Weakness tags to watch (see weakness-detector.ts). */
  watchFor?: string[];
  tags?: string[];
}

export const EVAL_SCENARIOS: EvalScenario[] = [
  {
    id: 'scout-kohli-ipl',
    query: "What are Virat Kohli's strengths and weaknesses in IPL?",
    expectRoute: 'fast_path',
    expectIntent: 'player_scout',
    expectComponents: ['player_card', 'stats_table', 'strengths_gaps'],
    watchFor: ['EMPTY_HIGHLIGHTS', 'MISSING_SCOUT_UI', 'NARRATIVE_FALSE_UNAVAILABLE'],
    tags: ['scout', 'ipl', 'critical'],
  },
  {
    id: 'stats-kohli-ipl',
    query: 'Virat Kohli IPL stats',
    expectRoute: 'fast_path',
    expectIntent: 'player_stats',
    expectComponents: ['player_card', 'stats_table'],
    watchFor: ['EMPTY_HIGHLIGHTS', 'EMPTY_STATS_TABLE'],
    tags: ['stats', 'ipl'],
  },
  {
    id: 'compare-rohit-kohli',
    query: 'Compare Rohit Sharma and Virat Kohli',
    expectRoute: 'fast_path',
    expectIntent: 'player_compare',
    expectComponents: ['comparison_card'],
    tags: ['compare'],
  },
  {
    id: 'leaderboard-ipl',
    query: 'IPL leaderboard top run scorers',
    expectRoute: 'fast_path',
    expectIntent: 'leaderboard',
    expectComponents: ['leaderboard_table'],
    watchFor: ['EMPTY_LEADERBOARD_TABLE'],
    tags: ['leaderboard'],
  },
  {
    id: 'standings-ipl',
    query: 'IPL standings points table',
    expectRoute: 'fast_path',
    expectIntent: 'league_standings',
    expectComponents: ['leaderboard_table'],
    tags: ['standings'],
  },
  {
    id: 'h2h-csk-mi',
    query: 'Chennai Super Kings vs Mumbai Indians head to head',
    expectRoute: 'fast_path',
    expectIntent: 'head_to_head',
    expectComponents: ['comparison_card'],
    tags: ['h2h'],
  },
  {
    id: 'dismissal-kohli-ipl',
    query: 'Virat Kohli dismissal analysis IPL',
    expectRoute: 'fast_path',
    expectIntent: 'dismissal_analysis',
    expectComponents: ['stats_table'],
    watchFor: ['EMPTY_STATS_TABLE'],
    tags: ['dismissal', 'local-mcp', 'critical'],
  },
  {
    id: 'dismissal-samson-ipl-vs-odi',
    query: 'Sanju Samson dismissal analysis in IPL vs ODI , how it different',
    expectRoute: 'ai_path',
    expectIntent: 'dismissal_analysis',
    tags: ['dismissal', 'format-compare', 'ai'],
  },
  {
    id: 'explain-why',
    query: 'Why did Kohli struggle in powerplay in IPL 2024?',
    expectRoute: 'ai_path',
    tags: ['ai', 'explain'],
  },
  {
    id: 'scorecard-fixture',
    query: 'Show scorecard for fixture 12345',
    expectRoute: 'fast_path',
    expectIntent: 'match_scorecard',
    tags: ['scorecard'],
  },
];

export const SYSTEM_LAYERS_DOC = `
CricInsights stack (what this eval exercises):
- SmartRouter → fast_path (in-process MCP) vs ai_path (Bedrock + local tools)
- template-engine → ChatManifest (components + narrative)
- UI → ManifestRenderer (schema normalization for tables/leaderboards)
`;
