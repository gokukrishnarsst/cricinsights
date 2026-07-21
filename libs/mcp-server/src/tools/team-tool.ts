import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTeamDataSchema } from '../schemas/tool-schemas.js';
import { handleGetTeamData } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the get_team_data MCP tool. */
export function registerTeamTool(server: McpServer): void {
  server.registerTool(
    'get_team_data',
    {
      title: 'Get team data',
      description:
        'Fetch team profile, squad, recent form, or season standings stats by data_type.',
      inputSchema: getTeamDataSchema,
    },
    async (input) => runTool(() => handleGetTeamData(input)),
  );
}

export { handleGetTeamData } from './tool-handlers.js';
