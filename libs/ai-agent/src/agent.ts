import {
  logToolLoopSummary,
  MaxToolIterationsError,
} from './agent-errors.js';
import {
  BedrockClient,
  getBedrockModelId,
  isBedrockEnabled,
} from './bedrock-client.js';
import { resolveAgentTools } from './agent-tools.js';
import { agentLog } from './logger.js';
import {
  buildAgentResponse,
  buildDataUnavailableResponse,
  buildFallbackResponse,
  parseModelManifest,
} from './response-builder.js';
import { executePlannedToolUses } from './tool-orchestrator.js';
import { createToolPlan, type AgentRequestContext, type ToolPlan } from './tool-planner.js';
import {
  finalizeManifestAfterToolLimit,
  getDefaultMaxToolIterations,
} from './tool-limit-finalize.js';
import type {
  AgentResponse,
  AgentStreamEvent,
  AgentToolCallRecord,
  BedrockMessage,
  ConversationMessage,
  CricketAgentOptions,
} from './types.js';

const DEFAULT_MAX_TOOL_ITERATIONS = getDefaultMaxToolIterations();

/**
 * Conversational cricket AI agent backed by AWS Bedrock and in-process MCP tools.
 */
export class CricketAIAgent {
  private readonly bedrock: BedrockClient;
  private readonly maxToolIterations: number;

  constructor(options: CricketAgentOptions = {}) {
    this.bedrock = new BedrockClient({
      modelId: options.modelId,
      region: options.region,
    });
    this.maxToolIterations = options.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS;
    agentLog.info(
      `CricketAIAgent initialized (maxToolIterations=${this.maxToolIterations})`,
    );
  }

  /**
   * Run a full non-streaming chat turn with tool-use loop.
   */
  async chat(
    query: string,
    history: ConversationMessage[] = [],
    context: AgentRequestContext = {},
  ): Promise<AgentResponse> {
    const started = Date.now();
    agentLog.step(
      `Chat started (query=${agentLog.summarizeJson(query)}, history=${history.length} message(s))`,
    );

    if (!isBedrockEnabled()) {
      agentLog.warn('Bedrock disabled via BEDROCK_ENABLED; using fallback response');
      return buildFallbackResponse(Date.now() - started, 'BEDROCK_ENABLED=false');
    }

    let toolCalls: AgentToolCallRecord[] = [];
    const toolPlan = createToolPlan(query, context);
    let agentTools: Awaited<ReturnType<typeof resolveAgentTools>> | undefined;

    try {
      agentTools = await resolveAgentTools({
        allowedToolNames: toolPlan.allowedToolNames,
        toolPlanPrompt: toolPlan.promptContext,
      });
      const result = await this.runToolLoop(query, history, agentTools, toolPlan);
      toolCalls = result.toolCalls;

      const response = buildAgentResponse({
        manifest: result.manifest,
        toolCalls,
        fallback: false,
        modelId: this.bedrock.modelId,
        latencyMs: Date.now() - started,
      });

      agentLog.info(
        `Chat completed (${response.latencyMs}ms, tools=${toolCalls.length}, components=${response.components.length})`,
      );
      return response;
    } catch (error) {
      if (error instanceof MaxToolIterationsError) {
        toolCalls = error.toolCalls;
        logToolLoopSummary(toolCalls, error.maxIterations);
        const recovered = await finalizeManifestAfterToolLimit({
          bedrock: this.bedrock,
          messages:
            error.conversationMessages ??
            toBedrockMessages(history, query),
          systemPrompt:
            error.systemPrompt ??
            agentTools?.systemPrompt ??
            (await resolveAgentTools({
              allowedToolNames: toolPlan.allowedToolNames,
              toolPlanPrompt: toolPlan.promptContext,
            })).systemPrompt,
        });
        if (recovered) {
          agentLog.info('Recovered final manifest after tool iteration limit');
          return buildAgentResponse({
            manifest: recovered,
            toolCalls,
            fallback: false,
            modelId: this.bedrock.modelId,
            latencyMs: Date.now() - started,
          });
        }
        agentLog.warn('Tool limit reached without a final manifest; returning database-unavailable response');
        return buildDataUnavailableResponse(
          Date.now() - started,
          'The request did not resolve to one final database-backed result.',
          toolCalls,
        );
      }

      const message = error instanceof Error ? error.message : 'Unknown Bedrock error';
      agentLog.error('Chat failed; returning fallback response', error);
      return buildFallbackResponse(Date.now() - started, message, toolCalls);
    }
  }

  /**
   * Stream partial text deltas and emit a final structured response.
   */
  async *chatStream(
    query: string,
    history: ConversationMessage[] = [],
    context: AgentRequestContext = {},
  ): AsyncGenerator<AgentStreamEvent> {
    const started = Date.now();
    agentLog.step(
      `Chat stream started (query=${agentLog.summarizeJson(query)}, history=${history.length} message(s))`,
    );

    if (!isBedrockEnabled()) {
      agentLog.warn('Bedrock disabled via BEDROCK_ENABLED; using fallback response');
      const response = buildFallbackResponse(
        Date.now() - started,
        'BEDROCK_ENABLED=false',
      );
      yield { type: 'error', message: response.narrative, fallback: true };
      yield { type: 'final', response };
      return;
    }

    const messages = toBedrockMessages(history, query);
    const toolCalls: AgentToolCallRecord[] = [];
    let iterations = 0;

    const toolPlan = createToolPlan(query, context);
    let agentTools: Awaited<ReturnType<typeof resolveAgentTools>> | undefined;

    try {
      // Tool resolution is kept inside this boundary so setup failures still
      // produce a terminal fallback event for the HTTP stream.
      agentTools = await resolveAgentTools({
        allowedToolNames: toolPlan.allowedToolNames,
        toolPlanPrompt: toolPlan.promptContext,
      });

      while (iterations < this.maxToolIterations) {
        iterations += 1;
        agentLog.step(
          `Tool loop iteration ${iterations}/${this.maxToolIterations} (stream)`,
        );

        let outputText = '';
        const toolUses: Array<{
          toolUseId: string;
          name: string;
          input: Record<string, unknown>;
        }> = [];

        for await (const event of this.bedrock.converseStream({
          system: agentTools.systemPrompt,
          messages,
          toolConfig: agentTools.toolConfig,
        })) {
          if (event.type === 'text_delta') {
            outputText += event.text;
            yield { type: 'text_delta', text: event.text };
          } else if (event.type === 'message_stop') {
            outputText = event.outputText || outputText;
            toolUses.push(...event.toolUses);
          } else if (event.type === 'error') {
            throw event.error;
          }
        }

        if (toolUses.length === 0) {
          if (toolCalls.length === 0) {
            agentLog.warn('Model returned text without database evidence; returning no-data response');
            yield {
              type: 'final',
              response: buildDataUnavailableResponse(
                Date.now() - started,
                'No database tool returned evidence for this request.',
                toolCalls,
              ),
            };
            return;
          }
          agentLog.info('Model returned final answer (no further tool requests)');
          const manifest = parseModelManifest(outputText);
          const response = buildAgentResponse({
            manifest,
            toolCalls,
            fallback: false,
            modelId: this.bedrock.modelId,
            latencyMs: Date.now() - started,
          });
          agentLog.info(
            `Chat stream completed (${response.latencyMs}ms, tools=${toolCalls.length})`,
          );
          yield { type: 'final', response };
          return;
        }

        agentLog.info(
          `Model requested ${toolUses.length} tool(s): ${toolUses.map((t) => t.name).join(', ')}`,
        );

        messages.push(buildAssistantToolUseMessage(toolUses));
        for (const toolUse of toolUses) {
          yield {
            type: 'tool_call_start',
            toolName: toolUse.name,
            input: toolUse.input,
          };
        }

        const executed = await executePlannedToolUses({
          toolUses,
          toolCalls,
          plan: toolPlan,
        });
        const toolResultBlocks = [];
        for (const result of executed) {
          if (result.error) {
            yield { type: 'tool_call_error', toolName: result.toolUse.name, error: result.error };
          } else if (result.output) {
            yield { type: 'tool_call_result', toolName: result.toolUse.name, output: result.output };
          }
          toolResultBlocks.push({
            toolResult: {
              toolUseId: result.toolUse.toolUseId,
              content: [{ json: result.compactOutput }],
              status: result.error ? 'error' as const : 'success' as const,
            },
          });
        }

        messages.push({ role: 'user', content: toolResultBlocks });
        agentLog.step(`Tool results sent back to model (${toolResultBlocks.length} block(s))`);
      }

      throw new MaxToolIterationsError(
        this.maxToolIterations,
        toolCalls,
        undefined,
        messages,
        agentTools.systemPrompt,
      );
    } catch (error) {
      const toolCallsForFallback =
        error instanceof MaxToolIterationsError ? error.toolCalls : toolCalls;

      if (error instanceof MaxToolIterationsError) {
        logToolLoopSummary(toolCallsForFallback, error.maxIterations);
        const recovered = await finalizeManifestAfterToolLimit({
          bedrock: this.bedrock,
          messages,
          systemPrompt: agentTools?.systemPrompt ?? '',
        });
        if (recovered) {
          agentLog.info('Recovered final manifest after tool iteration limit');
          const response = buildAgentResponse({
            manifest: recovered,
            toolCalls: toolCallsForFallback,
            fallback: false,
            modelId: this.bedrock.modelId,
            latencyMs: Date.now() - started,
          });
          yield { type: 'final', response };
          return;
        }
        agentLog.warn('Tool limit reached without a final manifest; returning database-unavailable response');
        yield {
          type: 'final',
          response: buildDataUnavailableResponse(
            Date.now() - started,
            'The request did not resolve to one final database-backed result.',
            toolCallsForFallback,
          ),
        };
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      agentLog.error('Chat stream failed; returning fallback response', error);
      const response = buildFallbackResponse(
        Date.now() - started,
        message,
        toolCallsForFallback,
      );
      if (!(error instanceof MaxToolIterationsError)) {
        yield { type: 'error', message, fallback: true };
      }
      yield { type: 'final', response };
    }
  }

  private async runToolLoop(
    query: string,
    history: ConversationMessage[],
    agentTools: Awaited<ReturnType<typeof resolveAgentTools>>,
    toolPlan: ToolPlan,
  ): Promise<{ manifest: ReturnType<typeof parseModelManifest>; toolCalls: AgentToolCallRecord[] }> {
    const messages = toBedrockMessages(history, query);
    const toolCalls: AgentToolCallRecord[] = [];
    let lastStopReason: string | undefined;

    for (let iteration = 0; iteration < this.maxToolIterations; iteration += 1) {
      agentLog.step(
        `Tool loop iteration ${iteration + 1}/${this.maxToolIterations}`,
      );

      const result = await this.bedrock.converse({
        system: agentTools.systemPrompt,
        messages,
        toolConfig: agentTools.toolConfig,
      });
      lastStopReason = result.stopReason;

      if (result.toolUses.length === 0) {
        if (toolCalls.length === 0) {
          agentLog.warn('Model returned text without database evidence; returning no-data manifest');
          return {
            manifest: {
              components: [
                {
                  type: 'insight_card',
                  data: {
                    title: 'No matching database data found',
                    content:
                      'No verified CricInsights database record was returned for this request. Add more specific teams, player, competition, season, or fixture details.',
                    severity: 'info',
                  },
                },
              ],
              narrative:
                'No verified CricInsights database result is available for that request. Add more specific teams, player, competition, season, or fixture details.',
            },
            toolCalls,
          };
        }
        agentLog.info('Model returned final answer (no further tool requests)');
        return {
          manifest: parseModelManifest(result.outputText),
          toolCalls,
        };
      }

      agentLog.info(
        `Model requested ${result.toolUses.length} tool(s): ${result.toolUses.map((t) => t.name).join(', ')}`,
      );

      messages.push(buildAssistantToolUseMessage(result.toolUses));
      const executed = await executePlannedToolUses({
        toolUses: result.toolUses,
        toolCalls,
        plan: toolPlan,
      });
      const toolResultBlocks = executed.map((execution) => ({
        toolResult: {
          toolUseId: execution.toolUse.toolUseId,
          content: [{ json: execution.compactOutput }],
          status: execution.error ? 'error' as const : 'success' as const,
        },
      }));

      messages.push({ role: 'user', content: toolResultBlocks });
      agentLog.step(`Tool results sent back to model (${toolResultBlocks.length} block(s))`);
    }

    throw new MaxToolIterationsError(
      this.maxToolIterations,
      toolCalls,
      lastStopReason,
      messages,
      agentTools.systemPrompt,
    );
  }
}

function toBedrockMessages(
  history: ConversationMessage[],
  query: string,
): BedrockMessage[] {
  const messages: BedrockMessage[] = history.map((message) => ({
    role: message.role,
    content: [{ text: message.content }],
  }));

  messages.push({ role: 'user', content: [{ text: query }] });
  return messages;
}

function buildAssistantToolUseMessage(
  toolUses: Array<{
    toolUseId: string;
    name: string;
    input: Record<string, unknown>;
  }>,
): BedrockMessage {
  return {
    role: 'assistant',
    content: toolUses.map((toolUse) => ({
      toolUse: {
        toolUseId: toolUse.toolUseId,
        name: toolUse.name,
        input: toolUse.input,
      },
    })),
  };
}

export { getBedrockModelId, isBedrockEnabled };
