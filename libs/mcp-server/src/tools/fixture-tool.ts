import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getFixturesSchema } from '../schemas/tool-schemas.js';
import { handleGetFixtures } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the get_fixtures MCP tool. */
export function registerFixtureTool(server: McpServer): void {
  server.registerTool(
    'get_fixtures',
    {
      title: 'Get fixtures',
      description:
        'List fixtures filtered by league, season, team, status, and optional date range.',
      inputSchema: getFixturesSchema,
    },
    async (input) => runTool(() => handleGetFixtures(input)),
  );
}

export { handleGetFixtures } from './tool-handlers.js';
