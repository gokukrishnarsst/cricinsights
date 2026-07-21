import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { compareEntitiesSchema } from '../schemas/tool-schemas.js';
import { handleCompareEntities } from './tool-handlers.js';
import { runTool } from './tool-response.js';

/** Registers the compare_entities MCP tool. */
export function registerCompareTool(server: McpServer): void {
  server.registerTool(
    'compare_entities',
    {
      title: 'Compare entities',
      description:
        'Side-by-side comparison for players, teams, or batsman-vs-bowler matchups with diff highlights.',
      inputSchema: compareEntitiesSchema,
    },
    async (input) => runTool(() => handleCompareEntities(input)),
  );
}

export { handleCompareEntities } from './tool-handlers.js';
