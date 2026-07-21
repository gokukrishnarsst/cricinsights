import { randomUUID } from 'node:crypto';
import { getPool } from './client.js';

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface LogChatMessageInput {
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  uiManifest?: Record<string, unknown> | null;
  routePath?: string | null;
  latencyMs?: number | null;
}

export type RecordChatMessageInput = Omit<LogChatMessageInput, 'sessionId'> & {
  sessionId?: string;
  userId?: string;
};

const ANONYMOUS_USER_ID = 'anonymous';

/**
 * Ensure a chat session exists; creates one when sessionId is omitted.
 */
export async function ensureChatSession(
  sessionId: string | undefined,
  userId: string = ANONYMOUS_USER_ID,
): Promise<string> {
  const id = sessionId?.trim() || randomUUID();

  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO app.chat_sessions (id, user_id, started_at, last_message_at, message_count)
       VALUES ($1, $2, now(), now(), 0)
       ON CONFLICT (id) DO NOTHING`,
      [id, userId],
    );
  } catch (error) {
    console.warn(
      '[database] chat session skipped:',
      error instanceof Error ? error.message : error,
    );
  }

  return id;
}

/**
 * Persist a chat message and bump session counters.
 */
export async function logChatMessage(input: LogChatMessageInput): Promise<void> {
  const pool = await getPool();

  await pool.query(
    `WITH session AS (
       INSERT INTO app.chat_sessions (id, user_id, started_at, last_message_at, message_count)
       VALUES ($1, $7, now(), now(), 1)
       ON CONFLICT (id) DO UPDATE
       SET last_message_at = now(),
           message_count = app.chat_sessions.message_count + 1
       RETURNING id
     )
     INSERT INTO app.chat_messages
       (session_id, role, content, ui_manifest, route_path, latency_ms)
     SELECT id, $2, $3, $4::jsonb, $5, $6 FROM session`,
    [
      input.sessionId,
      input.role,
      input.content,
      input.uiManifest ? JSON.stringify(input.uiManifest) : null,
      input.routePath ?? null,
      input.latencyMs ?? null,
      ANONYMOUS_USER_ID,
    ],
  );
}

/**
 * Best-effort chat logging — never throws if app schema is unavailable locally.
 */
export async function logChatMessageSafe(input: LogChatMessageInput): Promise<void> {
  try {
    await logChatMessage(input);
  } catch (error) {
    console.warn(
      '[database] chat log skipped:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Create or update a session and persist its first message in one database
 * round trip. This is the low-latency entry point for chat requests.
 */
export async function recordChatMessageSafe(
  input: RecordChatMessageInput,
): Promise<string> {
  const sessionId = input.sessionId?.trim() || randomUUID();
  try {
    const pool = await getPool();
    await pool.query(
      `WITH session AS (
         INSERT INTO app.chat_sessions (id, user_id, started_at, last_message_at, message_count)
         VALUES ($1, $7, now(), now(), 1)
         ON CONFLICT (id) DO UPDATE
         SET last_message_at = now(),
             message_count = app.chat_sessions.message_count + 1
         RETURNING id
       )
       INSERT INTO app.chat_messages
         (session_id, role, content, ui_manifest, route_path, latency_ms)
       SELECT id, $2, $3, $4::jsonb, $5, $6 FROM session`,
      [
        sessionId,
        input.role,
        input.content,
        input.uiManifest ? JSON.stringify(input.uiManifest) : null,
        input.routePath ?? null,
        input.latencyMs ?? null,
        input.userId ?? ANONYMOUS_USER_ID,
      ],
    );
  } catch (error) {
    console.warn(
      '[database] chat record skipped:',
      error instanceof Error ? error.message : error,
    );
  }
  return sessionId;
}
