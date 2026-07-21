import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getInsightSchema } from '../schemas/tool-schemas.js';
import { handleGetInsight } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the get_insight MCP tool. */
export function registerInsightsTool(server: McpServer): void {
  server.registerTool(
    'get_insight',
    {
      title: 'Get insight',
      description:
        'Retrieve a pre-computed insight UI manifest from the insights schema by type and key.',
      inputSchema: getInsightSchema,
    },
    async (input) => runTool(() => handleGetInsight(input)),
  );
}

export { handleGetInsight } from './tool-handlers.js';
