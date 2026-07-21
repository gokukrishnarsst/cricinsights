import type { ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import { MCP_TOOL_NAMES } from '@cricket-ai/mcp-server';
import { buildSystemPrompt } from './prompt-templates.js';
import { agentLog } from './logger.js';
import { CRICKET_LOCAL_BEDROCK_TOOLS } from './tool-executor.js';

export interface ResolvedAgentTools {
  toolConfig: ToolConfiguration;
  systemPrompt: string;
}

export interface ResolveAgentToolsOptions {
  allowedToolNames?: string[];
  toolPlanPrompt?: string;
}

/** Resolve the in-process Cricket MCP tools allowed for the current turn. */
export async function resolveAgentTools(
  options: ResolveAgentToolsOptions = {},
): Promise<ResolvedAgentTools> {
  const allowed = options.allowedToolNames
    ? new Set(options.allowedToolNames)
    : null;
  const selectedLocalNames = allowed
    ? MCP_TOOL_NAMES.filter((name) => allowed.has(name))
    : [...MCP_TOOL_NAMES];

  const toolConfig = filterToolConfig(
    CRICKET_LOCAL_BEDROCK_TOOLS,
    new Set(selectedLocalNames),
  );
  const systemPrompt = buildSystemPrompt({ localToolNames: selectedLocalNames });

  agentLog.info(`Agent tools resolved (local=${selectedLocalNames.length})`);
  return {
    toolConfig,
    systemPrompt: options.toolPlanPrompt
      ? `${systemPrompt}\n\n${options.toolPlanPrompt}`
      : systemPrompt,
  };
}

function filterToolConfig(
  config: ToolConfiguration,
  allowed: Set<string>,
): ToolConfiguration {
  return {
    tools: (config.tools ?? []).filter((tool) =>
      !!tool.toolSpec?.name && allowed.has(tool.toolSpec.name),
    ),
  };
}
