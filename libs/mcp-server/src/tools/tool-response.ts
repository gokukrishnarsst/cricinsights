import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Wrap successful tool output as structured JSON for MCP clients and Generative UI.
 */
export function toolJsonResult(
  data: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/**
 * Wrap tool failures with a consistent error payload.
 */
export function toolErrorResult(
  message: string,
  details?: Record<string, unknown>,
): CallToolResult {
  const payload = {
    error: true,
    message,
    ...details,
  };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: true,
  };
}

export async function runTool<T extends Record<string, unknown>>(
  fn: () => Promise<T>,
): Promise<CallToolResult> {
  try {
    const data = await fn();
    return toolJsonResult(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown tool execution error';
    return toolErrorResult(message);
  }
}
