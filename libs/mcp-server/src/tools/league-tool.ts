import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLeagueDataSchema } from '../schemas/tool-schemas.js';
import { handleGetLeagueData } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the get_league_data MCP tool. */
export function registerLeagueTool(server: McpServer): void {
  server.registerTool(
    'get_league_data',
    {
      title: 'Get league data',
      description:
        'League season data: standings, winner, leaderboards, fixtures, or combined season overview.',
      inputSchema: getLeagueDataSchema,
    },
    async (input) => runTool(() => handleGetLeagueData(input)),
  );
}

export { handleGetLeagueData } from './tool-handlers.js';
