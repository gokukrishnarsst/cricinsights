import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getPlayerStatsSchema } from '../schemas/tool-schemas.js';
import { handleGetPlayerStats } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the get_player_stats MCP tool. */
export function registerPlayerTool(server: McpServer): void {
  server.registerTool(
    'get_player_stats',
    {
      title: 'Get player stats',
      description:
        'Search a player by name or SportMonks ID and return profile plus career statistics. Optimized for PlayerCard UI.',
      inputSchema: getPlayerStatsSchema,
    },
    async (input) => runTool(() => handleGetPlayerStats(input)),
  );
}

export { handleGetPlayerStats } from './tool-handlers.js';
