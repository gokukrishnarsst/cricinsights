import { logChatMessageSafe, recordChatMessageSafe } from '@cricket-ai/database';
import { CricketAIAgent } from '@cricket-ai/ai-agent';
import {
  SmartRouter,
  executeFastPath,
  type RouteDecision,
} from '@cricket-ai/smart-router';
import { NextResponse } from 'next/server';
import {
  buildManifestFromAgent,
  buildManifestFromFastPath,
  type ChatManifest,
} from '@/lib/template-engine';

export const runtime = 'nodejs';

const router = new SmartRouter();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ChatRequestBody {
  message?: string;
  session_id?: string;
}

interface ChatSuccessResponse {
  success: true;
  route: 'fast_path' | 'ai_path';
  data: ChatManifest;
  meta: {
    latency_ms: number;
    intent: string;
    cached: boolean;
  };
}

export async function POST(request: Request) {
  const started = Date.now();

  try {
    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return chatError('Invalid JSON body', 400, started);
    }

    const message = body.message?.trim();
    if (!message) {
      return chatError('message is required', 400, started);
    }

    const sessionId = await recordChatMessageSafe({
      sessionId: normalizeSessionId(body.session_id),
      role: 'user',
      content: message,
      routePath: null,
      latencyMs: Date.now() - started,
    });

    const decision = router.classify(message);

    if (decision.route === 'fast_path') {
      try {
        return await handleFastPath({
          message,
          sessionId,
          started,
          decision,
        });
      } catch (error) {
        console.warn('[chat] fast path failed, falling back to AI path:', error);
        if (isNoDataError(error)) {
          return handleNoDataFastPath({
            sessionId,
            started,
            decision,
            error,
          });
        }
        return handleAiPathStream({
          message,
          sessionId,
          started,
          decision: { ...decision, route: 'ai_path' },
        });
      }
    }

    return handleAiPathStream({ message, sessionId, started, decision });
  } catch (error) {
    console.error('[chat] unhandled error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return chatError(message, 500, started);
  }
}

async function handleNoDataFastPath(params: {
  sessionId: string;
  started: number;
  decision: RouteDecision;
  error: unknown;
}): Promise<NextResponse> {
  const detail = params.error instanceof Error
    ? params.error.message
    : 'No matching record was found.';
  const data: ChatManifest = {
    components: [
      {
        type: 'insight_card',
        data: {
          title: 'No matching data found',
          content: `${detail} CricInsights did not find a verified database record for this request.`,
          severity: 'info',
        },
      },
    ],
    narrative: `No matching CricInsights database data was found. ${detail}`,
    shareable: false,
  };
  const latencyMs = Date.now() - params.started;
  const response: ChatSuccessResponse = {
    success: true,
    route: 'fast_path',
    data,
    meta: {
      latency_ms: latencyMs,
      intent: params.decision.intent,
      cached: false,
    },
  };
  await logChatMessageSafe({
    sessionId: params.sessionId,
    role: 'assistant',
    content: data.narrative,
    uiManifest: data as unknown as Record<string, unknown>,
    routePath: 'fast_path',
    latencyMs,
  });
  return NextResponse.json(response);
}

async function handleFastPath(params: {
  message: string;
  sessionId: string;
  started: number;
  decision: RouteDecision;
}): Promise<NextResponse> {
  const result = await executeFastPath(params.decision);
  const data = buildManifestFromFastPath(result);
  const latencyMs = Date.now() - params.started;

  const response: ChatSuccessResponse = {
    success: true,
    route: 'fast_path',
    data,
    meta: {
      latency_ms: latencyMs,
      intent: params.decision.intent,
      cached: false,
    },
  };

  await logChatMessageSafe({
    sessionId: params.sessionId,
    role: 'assistant',
    content: data.narrative,
    uiManifest: data as unknown as Record<string, unknown>,
    routePath: 'fast_path',
    latencyMs,
  });

  return NextResponse.json(response);
}

function handleAiPathStream(params: {
  message: string;
  sessionId: string;
  started: number;
  decision: RouteDecision;
}): NextResponse {
  const agent = new CricketAIAgent();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      send({
        event: 'route',
        route: 'ai_path',
        intent: params.decision.intent,
        session_id: params.sessionId,
      });

      let narrative = '';
      let components: ChatManifest['components'] = [];

      try {
        for await (const event of agent.chatStream(params.message, [], {
          routeHint: {
            intent: params.decision.intent,
            confidence: params.decision.confidence,
            params: params.decision.params,
          },
        })) {
          if (event.type === 'text_delta') {
            narrative += event.text;
            send({ event: 'text_delta', text: event.text });
            send({
              event: 'partial',
              data: { narrative, components },
            });
          } else if (event.type === 'tool_call_start') {
            send({
              event: 'tool_call',
              toolName: event.toolName,
              input: event.input,
            });
          } else if (event.type === 'tool_call_result') {
            send({
              event: 'tool_result',
              toolName: event.toolName,
              output: event.output,
            });
          } else if (event.type === 'tool_call_error') {
            send({
              event: 'tool_error',
              toolName: event.toolName,
              error: event.error,
            });
          } else if (event.type === 'final') {
            const manifest = buildManifestFromAgent({
              components: event.response.components,
              narrative: event.response.narrative || narrative,
              toolCalls: event.response.toolCalls,
            });
            components = manifest.components;
            narrative = manifest.narrative;

            const latencyMs = Date.now() - params.started;
            const finalPayload: ChatSuccessResponse = {
              success: true,
              route: 'ai_path',
              data: manifest,
              meta: {
                latency_ms: latencyMs,
                intent: params.decision.intent,
                cached: false,
              },
            };

            send({ event: 'partial', data: manifest });
            send({ event: 'final', ...finalPayload, session_id: params.sessionId });

            await logChatMessageSafe({
              sessionId: params.sessionId,
              role: 'assistant',
              content: manifest.narrative,
              uiManifest: manifest as unknown as Record<string, unknown>,
              routePath: 'ai_path',
              latencyMs,
            });
          } else if (event.type === 'error') {
            send({
              event: 'error',
              message: event.message,
              fallback: event.fallback,
            });
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'AI path failed';
        send({ event: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function normalizeSessionId(sessionId: string | undefined): string | undefined {
  if (!sessionId?.trim()) {
    return undefined;
  }
  return UUID_RE.test(sessionId.trim()) ? sessionId.trim() : undefined;
}

function isNoDataError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /\b(no (?:team|player|fixture|fixtures|match|matches|completed final|data)|not found|requires? (?:a |an )?(?:player|team|fixture|league|season|name|id)|provide (?:a |an )?(?:player|team|fixture|league|season|name|id))/i.test(message);
}

function chatError(message: string, status: 400 | 405 | 500, started: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      meta: {
        latency_ms: Date.now() - started,
        intent: 'unknown',
        cached: false,
      },
    },
    { status },
  );
}

export function GET() {
  return chatError('Method not allowed', 405, Date.now());
}
