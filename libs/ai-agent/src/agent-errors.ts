import { agentLog } from './logger.js';
import type { AgentToolCallRecord, BedrockMessage } from './types.js';

/** Error thrown when the Bedrock tool-use loop exceeds max iterations. */
export class MaxToolIterationsError extends Error {
  constructor(
    readonly maxIterations: number,
    readonly toolCalls: AgentToolCallRecord[],
    readonly lastStopReason?: string,
    readonly conversationMessages?: BedrockMessage[],
    readonly systemPrompt?: string,
  ) {
    super(
      `Maximum tool iterations exceeded (${maxIterations}). ` +
        `Executed ${toolCalls.length} tool call(s). ` +
        'The model kept requesting tools without returning a final answer.',
    );
    this.name = 'MaxToolIterationsError';
  }
}

export function summarizeToolCalls(toolCalls: AgentToolCallRecord[]): string {
  if (toolCalls.length === 0) {
    return 'none';
  }

  return toolCalls
    .map((call, index) => {
      const status = call.error ? `failed (${call.error})` : 'ok';
      return `${index + 1}. ${call.toolName} [${status}]`;
    })
    .join('; ');
}

export function logToolLoopSummary(
  toolCalls: AgentToolCallRecord[],
  maxIterations: number,
): void {
  agentLog.warn(
    `Tool loop exhausted after ${maxIterations} iteration(s). Tool history: ${summarizeToolCalls(toolCalls)}`,
  );
}
