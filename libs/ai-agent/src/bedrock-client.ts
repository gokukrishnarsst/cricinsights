import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  type Message,
  type ToolConfiguration,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { agentLog } from './logger.js';
import type {
  BedrockConverseResult,
  BedrockMessage,
  BedrockStreamEvent,
  BedrockToolUseRequest,
} from './types.js';

const DEFAULT_REGION = 'ap-southeast-2';
const DEFAULT_MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const DEFAULT_MAX_TOKENS = 1_800;
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_CONNECTION_TIMEOUT_MS = 15_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 180_000;

/** Whether Bedrock AI path is enabled via environment. */
export function isBedrockEnabled(): boolean {
  const flag = process.env.BEDROCK_ENABLED?.trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'no';
}

/** Resolve Bedrock model ID from environment. */
export function getBedrockModelId(override?: string): string {
  return (
    override ??
    process.env.BEDROCK_MODEL_ID?.trim() ??
    DEFAULT_MODEL_ID
  );
}

/** Resolve AWS region from environment. */
export function getBedrockRegion(override?: string): string {
  return (
    override ??
    process.env.AWS_REGION?.trim() ??
    process.env.AWS_DEFAULT_REGION?.trim() ??
    DEFAULT_REGION
  );
}

/**
 * Bedrock Runtime wrapper with Converse / ConverseStream APIs.
 * Credentials are resolved via the AWS default provider chain
 * (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, profile, etc.).
 */
export class BedrockClient {
  private readonly client: BedrockRuntimeClient;
  readonly modelId: string;

  constructor(options?: { modelId?: string; region?: string }) {
    const region = getBedrockRegion(options?.region);
    this.modelId = getBedrockModelId(options?.modelId);
    this.client = new BedrockRuntimeClient({
      region,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: readBoundedNumber(
          'BEDROCK_CONNECTION_TIMEOUT_MS',
          DEFAULT_CONNECTION_TIMEOUT_MS,
          1_000,
          120_000,
        ),
        requestTimeout: readBoundedNumber(
          'BEDROCK_REQUEST_TIMEOUT_MS',
          DEFAULT_REQUEST_TIMEOUT_MS,
          5_000,
          600_000,
        ),
        throwOnRequestTimeout: true,
      }),
    });
    agentLog.info(`Bedrock client ready (region=${region}, model=${this.modelId})`);
  }

  /** Non-streaming converse call with retries. */
  async converse(params: {
    system: string;
    messages: BedrockMessage[];
    toolConfig?: ToolConfiguration;
  }): Promise<BedrockConverseResult> {
    agentLog.step(
      `Bedrock Converse request (messages=${params.messages.length}, tools=${params.toolConfig?.tools?.length ?? 0})`,
    );

    return withRetry(async () => {
      const response = await this.client.send(
        new ConverseCommand({
          modelId: this.modelId,
          system: [{ text: params.system }],
          messages: params.messages as Message[],
          toolConfig: params.toolConfig,
          inferenceConfig: getInferenceConfig(),
        }),
      );

      const parsed = {
        ...parseConverseOutput(response.output?.message),
        stopReason: response.stopReason,
      };

      agentLog.info(
        `Bedrock Converse response (stopReason=${parsed.stopReason ?? 'unknown'}, ` +
          `toolRequests=${parsed.toolUses.length}, textChars=${parsed.outputText.length})`,
      );
      agentLog.debug(`Bedrock output preview: ${agentLog.summarizeJson(parsed.outputText)}`);

      return parsed;
    }, 'Converse');
  }

  /** Streaming converse call yielding text deltas and final tool-use summary. */
  async *converseStream(params: {
    system: string;
    messages: BedrockMessage[];
    toolConfig?: ToolConfiguration;
  }): AsyncGenerator<BedrockStreamEvent> {
    agentLog.step(
      `Bedrock ConverseStream request (messages=${params.messages.length}, tools=${params.toolConfig?.tools?.length ?? 0})`,
    );

    try {
      const response = await withRetry(async () =>
        this.client.send(
          new ConverseStreamCommand({
            modelId: this.modelId,
            system: [{ text: params.system }],
            messages: params.messages as Message[],
            toolConfig: params.toolConfig,
            inferenceConfig: getInferenceConfig(),
          }),
        ),
      'ConverseStream');

      let outputText = '';
      const streamedToolUses = new Map<
        number,
        BedrockToolUseRequest & { inputJson: string }
      >();
      let fallbackToolIndex = 0;
      let stopReason: string | undefined;

      if (response.stream) {
        for await (const event of response.stream) {
          if (event.contentBlockDelta?.delta?.text) {
            const text = event.contentBlockDelta.delta.text;
            outputText += text;
            yield { type: 'text_delta', text };
          }

          if (event.contentBlockStart?.start?.toolUse) {
            const toolUse = event.contentBlockStart.start.toolUse;
            const index = event.contentBlockStart.contentBlockIndex ?? fallbackToolIndex;
            fallbackToolIndex += 1;
            streamedToolUses.set(index, {
              toolUseId: toolUse.toolUseId ?? cryptoRandomId(),
              name: toolUse.name ?? 'unknown_tool',
              input: {},
              inputJson: '',
            });
          }

          if (event.contentBlockDelta?.delta?.toolUse) {
            const partial = event.contentBlockDelta.delta.toolUse;
            const deltaIndex = event.contentBlockDelta.contentBlockIndex;
            const current = deltaIndex === undefined
              ? undefined
              : streamedToolUses.get(deltaIndex);
            if (current && partial.input) {
              current.inputJson += partial.input;
            }
          }

          if (event.messageStop?.stopReason) {
            stopReason = event.messageStop.stopReason;
          }

          if (event.metadata?.usage) {
            // usage metadata available for observability
          }
        }
      }

      const toolUses = [...streamedToolUses.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, { inputJson, ...toolUse }]) => ({
          ...toolUse,
          input: parseToolInput(inputJson),
        }));

      agentLog.info(
        `Bedrock ConverseStream complete (stopReason=${stopReason ?? 'unknown'}, ` +
          `toolRequests=${toolUses.length}, textChars=${outputText.length})`,
      );

      yield {
        type: 'message_stop',
        stopReason,
        outputText,
        toolUses,
      };
    } catch (error) {
      agentLog.error('Bedrock ConverseStream failed', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

function parseConverseOutput(message: Message | undefined): BedrockConverseResult {
  const content = message?.content ?? [];
  let outputText = '';
  const toolUses: BedrockToolUseRequest[] = [];

  for (const block of content) {
    if (block.text) {
      outputText += block.text;
    }
    if (block.toolUse) {
      toolUses.push({
        toolUseId: block.toolUse.toolUseId ?? cryptoRandomId(),
        name: block.toolUse.name ?? 'unknown_tool',
        input: (block.toolUse.input as Record<string, unknown>) ?? {},
      });
    }
  }

  return {
    stopReason: undefined,
    outputText,
    toolUses,
    rawMessage: message
      ? {
          role: 'assistant',
          content: content.map((block: NonNullable<Message['content']>[number]) => {
            if (block.text) return { text: block.text };
            if (block.toolUse) {
              return {
                toolUse: {
                  toolUseId: block.toolUse.toolUseId ?? cryptoRandomId(),
                  name: block.toolUse.name ?? 'unknown_tool',
                  input: (block.toolUse.input as Record<string, unknown>) ?? {},
                },
              };
            }
            return { text: '' };
          }),
        }
      : undefined,
  };
}

function parseToolInput(input: string): Record<string, unknown> {
  if (!input.trim()) return {};
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch {
    agentLog.warn('Unable to parse streamed Bedrock tool input; invoking tool with an empty input object');
    return {};
  }
}

function getInferenceConfig(): { maxTokens: number; temperature: number } {
  return {
    maxTokens: readBoundedNumber('BEDROCK_MAX_TOKENS', DEFAULT_MAX_TOKENS, 512, 4_096),
    temperature: readBoundedNumber('BEDROCK_TEMPERATURE', DEFAULT_TEMPERATURE, 0, 1),
  };
}

function readBoundedNumber(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Number(process.env[name]?.trim());
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  attempt = 1,
): Promise<T> {
  try {
    if (attempt > 1) {
      agentLog.step(`${operation} retry attempt ${attempt}/${MAX_RETRIES}`);
    }
    return await fn();
  } catch (error) {
    if (attempt >= MAX_RETRIES || !isRetryable(error)) {
      agentLog.error(`${operation} failed after ${attempt} attempt(s)`, error);
      throw error;
    }
    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    agentLog.warn(
      `${operation} throttled or timed out; retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
    );
    await sleep(delay);
    return withRetry(fn, operation, attempt + 1);
  }
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return (
    name.includes('Throttling') ||
    name.includes('Timeout') ||
    message.includes('Too Many Requests') ||
    message.includes('Rate exceeded')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cryptoRandomId(): string {
  return `tooluse_${Math.random().toString(36).slice(2, 10)}`;
}
