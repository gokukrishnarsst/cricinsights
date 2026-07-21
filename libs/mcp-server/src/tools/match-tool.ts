import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getMatchDataSchema } from '../schemas/tool-schemas.js';
import { handleGetMatchData } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the get_match_data MCP tool. */
export function registerMatchTool(server: McpServer): void {
  server.registerTool(
    'get_match_data',
    {
      title: 'Get match data',
      description:
        'Full match details: fixture info, batting/bowling scorecards, and innings runs. Lookup by fixture ID, recent team matches, or both team names with optional year, format, and competition. Returns an explicit not-found or ambiguous result when the database cannot resolve one match.',
      inputSchema: getMatchDataSchema,
    },
    async (input) => runTool(() => handleGetMatchData(input)),
  );
}

export { handleGetMatchData } from './tool-handlers.js';
