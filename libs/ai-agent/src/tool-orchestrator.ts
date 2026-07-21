import { executeBedrockToolCall } from './tool-executor.js';
import { compactToolResultForModel } from './tool-result-compact.js';
import type { ToolPlan } from './tool-planner.js';
import type { AgentToolCallRecord, BedrockToolUseRequest } from './types.js';

export interface ToolExecutionResult {
  toolUse: BedrockToolUseRequest;
  output?: Record<string, unknown>;
  compactOutput: Record<string, unknown>;
  error?: string;
}

export async function executePlannedToolUses(params: {
  toolUses: BedrockToolUseRequest[];
  toolCalls: AgentToolCallRecord[];
  plan: ToolPlan;
}): Promise<ToolExecutionResult[]> {
  const allowed = new Set(params.plan.allowedToolNames);
  const remaining = Math.max(params.plan.maxToolCalls - params.toolCalls.length, 0);
  const seen = new Set(params.toolCalls.map((call) => toolSignature(call.toolName, call.input)));
  let accepted = 0;

  const selected = params.toolUses.map((toolUse) => {
    const signature = toolSignature(toolUse.name, toolUse.input);
    if (!allowed.has(toolUse.name)) {
      return { toolUse, error: `Tool ${toolUse.name} is not relevant to the classified request. Use one of: ${params.plan.allowedToolNames.join(', ')}` };
    }
    if (seen.has(signature)) {
      return { toolUse, error: 'This exact tool call was already completed. Synthesize the available result instead.' };
    }
    if (accepted >= params.plan.maxToolUsesPerTurn || accepted >= remaining) {
      return { toolUse, error: 'Tool-call budget reached. Synthesize a final answer from the available results.' };
    }
    accepted += 1;
    seen.add(signature);
    return { toolUse };
  });

  const executed = await Promise.all(selected.map(async (selection): Promise<ToolExecutionResult> => {
    if (selection.error) {
      params.toolCalls.push({
        toolName: selection.toolUse.name,
        input: selection.toolUse.input,
        error: selection.error,
      });
      return {
        toolUse: selection.toolUse,
        error: selection.error,
        compactOutput: { error: selection.error },
      };
    }
    try {
      const { output, record } = await executeBedrockToolCall(
        selection.toolUse.name,
        selection.toolUse.input,
      );
      params.toolCalls.push(record);
      const compacted = compactToolResultForModel(output);
      return {
        toolUse: selection.toolUse,
        output,
        compactOutput: compacted.output,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      params.toolCalls.push({
        toolName: selection.toolUse.name,
        input: selection.toolUse.input,
        error: message,
      });
      return {
        toolUse: selection.toolUse,
        error: message,
        compactOutput: { error: message },
      };
    }
  }));

  return executed;
}

function toolSignature(name: string, input: Record<string, unknown>): string {
  return `${name}:${stableStringify(input)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
