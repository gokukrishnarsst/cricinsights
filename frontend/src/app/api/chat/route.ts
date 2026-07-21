import { NextResponse } from "next/server";
import {
  encodeAgentSse,
  runCricAgent,
  streamCricAgent,
} from "@/lib/agent";
import type { ChatMessage } from "@/lib/agent/types";

export const maxDuration = 60;

interface ChatRequestBody {
  messages: ChatMessage[];
  stream?: boolean;
  sessionId?: string;
}

/**
 * POST /api/chat
 * - Default: JSON { text, ui, sessionId, mode, toolCalls? }
 * - stream=true: SSE with events status | text-delta | result | error | done
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = body.messages ?? [];

    if (!messages.length) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 },
      );
    }

    if (body.stream) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const event of streamCricAgent({
              messages,
              sessionId: body.sessionId,
              stream: true,
            })) {
              controller.enqueue(
                encoder.encode(encodeAgentSse(event)),
              );
            }
          } catch (e) {
            controller.enqueue(
              encoder.encode(
                encodeAgentSse({
                  event: "error",
                  data: {
                    message:
                      e instanceof Error
                        ? e.message
                        : "Stream processing failed",
                  },
                }),
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const result = await runCricAgent({
      messages,
      sessionId: body.sessionId,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/chat]", e);
    return NextResponse.json(
      {
        text: "Unable to process request. Check Bedrock credentials or use mock mode.",
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/** GET /api/chat — agent metadata */
export async function GET() {
  return NextResponse.json({
    agent: "cricinsights-chat",
    streaming: true,
    modes: ["local", "agentcore"],
    usage: {
      json: 'POST { "messages": [{ "role": "user", "content": "..." }] }',
      stream:
        'POST { "messages": [...], "stream": true, "sessionId": "optional-uuid" }',
    },
  });
}
