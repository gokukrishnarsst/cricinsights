import type { BedrockClient } from './bedrock-client.js';
import { agentLog } from './logger.js';
import { parseModelManifest } from './response-builder.js';
import type { BedrockMessage, UIManifest } from './types.js';

export const TOOL_LIMIT_FINALIZE_APPEND = `
## Final response (mandatory when instructed)
You must NOT request any more tools. Using ONLY tool results already present in the conversation,
output the required JSON manifest (components + narrative) immediately.
If data is incomplete, state limitations in the narrative and render partial UI from what you have.
`;

/**
 * One non-tool Bedrock turn to synthesize a manifest after the tool loop hits its cap.
 */
export async function finalizeManifestAfterToolLimit(params: {
  bedrock: BedrockClient;
  messages: BedrockMessage[];
  systemPrompt: string;
}): Promise<UIManifest | null> {
  agentLog.warn('Attempting manifest finalization after tool iteration limit');

  try {
    const result = await params.bedrock.converse({
      system: `${params.systemPrompt}\n\n${TOOL_LIMIT_FINALIZE_APPEND}`,
      messages: [
        ...params.messages,
        {
          role: 'user',
          content: [
            {
              text: 'Stop calling tools. Respond with ONLY the final JSON object (components + narrative) using data from prior tool results.',
            },
          ],
        },
      ],
    });

    if (result.toolUses.length > 0) {
      agentLog.warn(
        `Finalize turn still requested ${result.toolUses.length} tool(s); using text output only`,
      );
    }

    if (!result.outputText?.trim()) {
      return null;
    }

    return parseModelManifest(result.outputText);
  } catch (error) {
    agentLog.error('Finalize after tool limit failed', error);
    return null;
  }
}

export function getDefaultMaxToolIterations(): number {
  const raw = process.env.AGENT_MAX_TOOL_ITERATIONS?.trim();
  const parsed = raw ? Number(raw) : 4;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 4;
  }
  return Math.min(Math.floor(parsed), 8);
}
