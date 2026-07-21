/**
 * Next.js app agent — uses architecture runtime with Generative UI hydration.
 */
import { stepCountIs, ToolLoopAgent, type ToolSet } from "ai";
import { hydrateChatResponse } from "@/lib/ai/hydrate-response";
import { mockChatResponse } from "@/lib/ai/mock-chat";
import { shouldUseMockData } from "@/lib/db";
import type { CricInsightsResponse } from "@/types/generative-ui";
import {
  getAgentRunMode,
  getBedrockModel,
  hasBedrockCredentials,
  invokeAgentCoreRuntime,
  resolveSessionId,
} from "@architecture/agent/bedrock-agent";
import { buildAgentInstructions } from "./prompts";
import { buildAgentTools } from "@architecture/agent/tool-executor";
import type {
  AgentRunOptions,
  AgentRunResult,
  AgentStreamEvent,
  ChatMessage,
} from "./types";

const MAX_AGENT_STEPS = 8;
const AGENT_ID = "cricinsights-chat";

function parseAgentJson(text: string): CricInsightsResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as CricInsightsResponse;
      if (typeof parsed.text === "string") return parsed;
    } catch {
      /* fall through */
    }
  }
  return { text: text.trim() || "I could not format a structured response." };
}

function normalizeToolResults(
  toolResults: Array<{ type?: string; toolName?: string; output?: unknown }>,
): Parameters<typeof hydrateChatResponse>[1] {
  return toolResults.map((t) => ({
    type: t.type ?? "tool-result",
    toolName: t.toolName,
    output: t.output,
  }));
}

function createChatAgent(streaming: boolean) {
  return new ToolLoopAgent({
    id: AGENT_ID,
    model: getBedrockModel(),
    instructions: buildAgentInstructions(streaming),
    // The frontend and sibling architecture can have separate AI SDK installs.
    // Their runtime tool contracts are compatible despite nominal type identity.
    tools: buildAgentTools({ maxWebSearches: 1 }) as ToolSet,
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
  });
}

async function runLocalAgent(
  messages: ChatMessage[],
  sessionId: string,
): Promise<AgentRunResult> {
  const agent = createChatAgent(false);
  const toolCalls: string[] = [];

  const result = await agent.generate({
    messages,
    onToolExecutionStart: (event) => {
      toolCalls.push(event.toolCall.toolName);
    },
  });

  const hydrated = hydrateChatResponse(
    parseAgentJson(result.text),
    normalizeToolResults(result.toolResults),
  );

  return {
    ...hydrated,
    sessionId,
    mode: "local",
    toolCalls,
  };
}

async function runAgentCoreRemote(
  messages: ChatMessage[],
  sessionId: string,
): Promise<AgentRunResult | null> {
  const lastUser = messages[messages.length - 1]?.content ?? "";
  const raw = await invokeAgentCoreRuntime({
    prompt: lastUser,
    messages,
    sessionId,
  });
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AgentRunResult;
    if (typeof parsed.text === "string") {
      return { ...parsed, sessionId, mode: "agentcore" };
    }
  } catch {
    return { text: raw, sessionId, mode: "agentcore" };
  }
  return { text: raw, sessionId, mode: "agentcore" };
}

export async function runCricAgent(
  options: AgentRunOptions,
): Promise<AgentRunResult> {
  const sessionId = resolveSessionId(options.sessionId);
  const messages = options.messages;

  if (options.mock || shouldUseMockData()) {
    const mock = await mockChatResponse(messages[messages.length - 1]?.content ?? "");
    return { ...mock, sessionId, mode: "local" };
  }

  if (!hasBedrockCredentials()) {
    const mock = await mockChatResponse(messages[messages.length - 1]?.content ?? "");
    return { ...mock, sessionId, mode: "local" };
  }

  if (getAgentRunMode() === "agentcore") {
    const remote = await runAgentCoreRemote(messages, sessionId);
    if (remote) return remote;
    console.warn("[agent] AgentCore invoke failed — falling back to local ToolLoopAgent");
  }

  return runLocalAgent(messages, sessionId);
}

export async function* streamCricAgent(
  options: AgentRunOptions,
): AsyncGenerator<AgentStreamEvent> {
  const sessionId = resolveSessionId(options.sessionId);
  const messages = options.messages;

  if (options.mock || shouldUseMockData() || !hasBedrockCredentials()) {
    yield {
      event: "status",
      data: { phase: "thinking", message: "Using demo data path..." },
    };
    const mock = await mockChatResponse(messages[messages.length - 1]?.content ?? "");
    yield { event: "result", data: mock };
    yield { event: "done", data: {} };
    return;
  }

  yield {
    event: "status",
    data: { phase: "thinking", message: "Analyzing your question..." },
  };

  const agent = createChatAgent(true);
  let streamResult: Awaited<ReturnType<typeof agent.stream>>;

  try {
    streamResult = await agent.stream({
      messages,
      onToolExecutionStart: () => {
        /* status events emitted from fullStream below */
      },
    });
  } catch (e) {
    yield {
      event: "error",
      data: {
        message: e instanceof Error ? e.message : "Agent failed to start",
        code: "UNAVAILABLE",
      },
    };
    return;
  }

  const textParts: string[] = [];

  for await (const part of streamResult.fullStream) {
    if (part.type === "tool-call") {
      yield {
        event: "status",
        data: {
          phase: "tool",
          tool: part.toolName,
          message: `Calling ${part.toolName}...`,
        },
      };
    }
    if (part.type === "text-delta") {
      textParts.push(part.text);
      yield { event: "text-delta", data: { delta: part.text } };
    }
  }

  yield {
    event: "status",
    data: { phase: "finalizing", message: "Building response..." },
  };

  const [text, toolResults] = await Promise.all([
    streamResult.text,
    streamResult.toolResults,
  ]);

  const hydrated = hydrateChatResponse(
    parseAgentJson(text || textParts.join("")),
    normalizeToolResults(toolResults),
  );

  yield { event: "result", data: hydrated };
  yield { event: "done", data: {} };
}

export function encodeAgentSse(event: AgentStreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export type { AgentRunOptions, AgentRunResult, AgentStreamEvent, ChatMessage };
