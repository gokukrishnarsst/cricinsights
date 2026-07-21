import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCompareTool } from './tools/compare-tool.js';
import { registerFixtureTool } from './tools/fixture-tool.js';
import { registerInsightsTool } from './tools/insights-tool.js';
import { registerLeagueTool } from './tools/league-tool.js';
import { registerMatchTool } from './tools/match-tool.js';
import { registerPlayerTool } from './tools/player-tool.js';
import { registerTeamTool } from './tools/team-tool.js';
import { registerAnalyticsTools } from './tools/analytics-tool.js';

export const MCP_SERVER_NAME = 'cricket-ai-mcp';
export const MCP_SERVER_VERSION = '0.0.1';

export const MCP_TOOL_NAMES = [
  'get_player_stats',
  'get_team_data',
  'get_match_data',
  'get_fixtures',
  'get_league_data',
  'compare_entities',
  'get_insight',
  'search_cricket_entities',
  'get_player_match_history',
  'get_match_context',
  'get_ball_analysis',
  'get_team_analytics',
  'get_venue_stats',
  'get_rankings',
  'get_trends',
  'get_live_match_state',
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

/**
 * Create and configure the Cricket AI MCP server with all cricket data tools.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      instructions:
        'Cricket data tools for players, teams, fixtures, leagues, comparisons, match analysis, and cached insights. ' +
        'All entity IDs are SportMonks IDs from master.* and matches.* schemas. ' +
        'Prefer get_fixtures or get_league_data before deep match drill-down.',
    },
  );

  registerPlayerTool(server);
  registerTeamTool(server);
  registerMatchTool(server);
  registerFixtureTool(server);
  registerLeagueTool(server);
  registerCompareTool(server);
  registerInsightsTool(server);
  registerAnalyticsTools(server);

  return server;
}
