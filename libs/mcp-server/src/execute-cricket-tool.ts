import type { McpToolName } from './server.js';
import {
  compareEntitiesSchema,
  getFixturesSchema,
  getInsightSchema,
  getLeagueDataSchema,
  getMatchDataSchema,
  getPlayerStatsSchema,
  getTeamDataSchema,
  getBallAnalysisSchema,
  getLiveMatchStateSchema,
  getMatchContextSchema,
  getPlayerMatchHistorySchema,
  getRankingsSchema,
  getTeamAnalyticsSchema,
  getTrendsSchema,
  getVenueStatsSchema,
  searchCricketEntitiesSchema,
} from './schemas/tool-schemas.js';
import { runTool } from './tools/tool-response.js';
import {
  handleCompareEntities,
  handleGetFixtures,
  handleGetInsight,
  handleGetLeagueData,
  handleGetMatchData,
  handleGetPlayerStats,
  handleGetTeamData,
  handleGetBallAnalysis,
  handleGetLiveMatchState,
  handleGetMatchContext,
  handleGetPlayerMatchHistory,
  handleGetRankings,
  handleGetTeamAnalytics,
  handleGetTrends,
  handleGetVenueStats,
  handleSearchCricketEntities,
} from './tools/tool-handlers.js';

export class CricketToolExecutionError extends Error {
  constructor(
    message: string,
    readonly toolName: McpToolName,
  ) {
    super(message);
    this.name = 'CricketToolExecutionError';
  }
}

/**
 * Execute a cricket MCP tool in-process (no stdio transport).
 */
export async function executeCricketTool(
  toolName: McpToolName,
  rawInput: unknown,
): Promise<Record<string, unknown>> {
  const result = await runTool(async () => {
    switch (toolName) {
      case 'get_player_stats':
        return handleGetPlayerStats(getPlayerStatsSchema.parse(rawInput));
      case 'get_team_data':
        return handleGetTeamData(getTeamDataSchema.parse(rawInput));
      case 'get_match_data':
        return handleGetMatchData(getMatchDataSchema.parse(rawInput));
      case 'get_fixtures':
        return handleGetFixtures(getFixturesSchema.parse(rawInput));
      case 'get_league_data':
        return handleGetLeagueData(getLeagueDataSchema.parse(rawInput));
      case 'compare_entities':
        return handleCompareEntities(compareEntitiesSchema.parse(rawInput));
      case 'get_insight':
        return handleGetInsight(getInsightSchema.parse(rawInput));
      case 'search_cricket_entities':
        return handleSearchCricketEntities(searchCricketEntitiesSchema.parse(rawInput));
      case 'get_player_match_history':
        return handleGetPlayerMatchHistory(getPlayerMatchHistorySchema.parse(rawInput));
      case 'get_match_context':
        return handleGetMatchContext(getMatchContextSchema.parse(rawInput));
      case 'get_ball_analysis':
        return handleGetBallAnalysis(getBallAnalysisSchema.parse(rawInput));
      case 'get_team_analytics':
        return handleGetTeamAnalytics(getTeamAnalyticsSchema.parse(rawInput));
      case 'get_venue_stats':
        return handleGetVenueStats(getVenueStatsSchema.parse(rawInput));
      case 'get_rankings':
        return handleGetRankings(getRankingsSchema.parse(rawInput));
      case 'get_trends':
        return handleGetTrends(getTrendsSchema.parse(rawInput));
      case 'get_live_match_state':
        return handleGetLiveMatchState(getLiveMatchStateSchema.parse(rawInput));
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  });

  if (result.isError) {
    const payload = result.structuredContent as { message?: string } | undefined;
    throw new CricketToolExecutionError(
      payload?.message ?? 'Tool execution failed',
      toolName,
    );
  }

  return result.structuredContent as Record<string, unknown>;
}
