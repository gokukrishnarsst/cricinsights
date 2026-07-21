import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getBallAnalysisSchema,
  getLiveMatchStateSchema,
  getMatchContextSchema,
  getPlayerMatchHistorySchema,
  getRankingsSchema,
  getTeamAnalyticsSchema,
  getTrendsSchema,
  getVenueStatsSchema,
  searchCricketEntitiesSchema,
} from '../schemas/tool-schemas.js';
import {
  handleGetBallAnalysis,
  handleGetLiveMatchState,
  handleGetMatchContext,
  handleGetPlayerMatchHistory,
  handleGetRankings,
  handleGetTeamAnalytics,
  handleGetTrends,
  handleGetVenueStats,
  handleSearchCricketEntities,
} from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Register the bounded analytical and discovery tools. */
export function registerAnalyticsTools(server: McpServer): void {
  server.registerTool(
    'search_cricket_entities',
    {
      title: 'Search cricket entities',
      description: 'Resolve players, teams, leagues, seasons, stages, venues, officials, and reference entities by name.',
      inputSchema: searchCricketEntitiesSchema,
    },
    async (input) => runTool(() => handleSearchCricketEntities(input)),
  );
  server.registerTool(
    'get_player_match_history',
    {
      title: 'Get player match history',
      description: 'Return bounded match-level batting and bowling performances with named opponents, competitions, dates, and venues.',
      inputSchema: getPlayerMatchHistorySchema,
    },
    async (input) => runTool(() => handleGetPlayerMatchHistory(input)),
  );
  server.registerTool(
    'get_match_context',
    {
      title: 'Get match context',
      description: 'Return fixture context such as lineup, venue, officials, extras, over progression, weather, odds, and latest snapshot.',
      inputSchema: getMatchContextSchema,
    },
    async (input) => runTool(() => handleGetMatchContext(input)),
  );
  server.registerTool(
    'get_ball_analysis',
    {
      title: 'Get ball analysis',
      description: 'Aggregate ball-by-ball data by over, phase, batter, bowler, dismissal, or partnership with bounded output.',
      inputSchema: getBallAnalysisSchema,
    },
    async (input) => runTool(() => handleGetBallAnalysis(input)),
  );
  server.registerTool(
    'get_team_analytics',
    {
      title: 'Get team analytics',
      description: 'Analyze team performance by venue, opponent, head-to-head scope, or season.',
      inputSchema: getTeamAnalyticsSchema,
    },
    async (input) => runTool(() => handleGetTeamAnalytics(input)),
  );
  server.registerTool(
    'get_venue_stats',
    {
      title: 'Get venue statistics',
      description: 'Return venue metadata, score patterns, team records, batting splits, or bowling splits.',
      inputSchema: getVenueStatsSchema,
    },
    async (input) => runTool(() => handleGetVenueStats(input)),
  );
  server.registerTool(
    'get_rankings',
    {
      title: 'Get team rankings',
      description: 'Return format and gender-specific team rankings from master.team_rankings.',
      inputSchema: getRankingsSchema,
    },
    async (input) => runTool(() => handleGetRankings(input)),
  );
  server.registerTool(
    'get_trends',
    {
      title: 'Get cricket trends',
      description: 'Return bounded season, month, or date trends for player, team, league, or venue metrics.',
      inputSchema: getTrendsSchema,
    },
    async (input) => runTool(() => handleGetTrends(input)),
  );
  server.registerTool(
    'get_live_match_state',
    {
      title: 'Get live match state',
      description: 'Return the latest snapshot, innings totals, and optional recent balls for a live or recent fixture.',
      inputSchema: getLiveMatchStateSchema,
    },
    async (input) => runTool(() => handleGetLiveMatchState(input)),
  );
}

export {
  handleGetBallAnalysis,
  handleGetLiveMatchState,
  handleGetMatchContext,
  handleGetPlayerMatchHistory,
  handleGetRankings,
  handleGetTeamAnalytics,
  handleGetTrends,
  handleGetVenueStats,
  handleSearchCricketEntities,
} from './tool-handlers.js';
