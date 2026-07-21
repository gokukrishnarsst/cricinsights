#!/usr/bin/env node
/**
 * Interactive Bedrock chat (general Q&A, no cricket tools).
 *
 * Usage (from repo root):
 *   pnpm bedrock:chat
 *   pnpm bedrock:chat -- "What is the LBW rule in cricket?"
 *   pnpm bedrock:chat -- --stream
 *
 * Requires .env with BEDROCK_MODEL_ID and AWS credentials (or AWS profile).
 */
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

const DEFAULT_SYSTEM =
  'You are a helpful assistant. Answer clearly and concisely unless the user asks for detail.';

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

function loadEnvFile(path: string): void {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function parseArgs(argv: string[]): { question: string | null; stream: boolean } {
  const args = argv.filter((a) => a !== '--');
  let stream = false;
  const positional: string[] = [];
  for (const arg of args) {
    if (arg === '--stream') stream = true;
    else if (arg === '--no-stream') stream = false;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  pnpm bedrock:chat
  pnpm bedrock:chat -- "Your question"
  pnpm bedrock:chat -- --stream

Env: BEDROCK_MODEL_ID, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
Optional: BEDROCK_REQUEST_TIMEOUT_MS (default 180000), BEDROCK_CHAT_DEBUG=1 for agent logs`);
      process.exit(0);
    } else positional.push(arg);
  }
  const question = positional.length ? positional.join(' ').trim() : null;
  return { question, stream };
}

function hasAwsCredentials(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() ||
      process.env.AWS_PROFILE?.trim() ||
      process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(),
  );
}

function formatError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }
  const name = 'name' in error ? String(error.name) : 'Error';
  const message = 'message' in error ? String(error.message) : String(error);
  const hint =
    name.includes('ExpiredToken') || message.includes('expired')
      ? ' Hint: refresh AWS_SESSION_TOKEN in .env (temporary creds expire).'
      : name.includes('AccessDenied') || message.includes('not authorized')
        ? ' Hint: enable the model in Bedrock console for this region/account.'
        : message.includes('timed out') || message.includes('Timeout')
          ? ' Hint: large models can be slow; raise BEDROCK_REQUEST_TIMEOUT_MS or try a smaller model.'
          : '';
  return `${name}: ${message}${hint}`;
}

function toBedrockMessages(history: HistoryMessage[]) {
  return history.map((m) => ({
    role: m.role,
    content: [{ text: m.content }],
  }));
}

function printWaiting(modelId: string): void {
  const timeoutSec = Math.round(
    Number(process.env.BEDROCK_REQUEST_TIMEOUT_MS ?? 180_000) / 1000,
  );
  console.log(
    `assistant> (calling Bedrock ${modelId} — up to ~${timeoutSec}s for large models…)`,
  );
}

async function reply(
  client: import('@cricket-ai/ai-agent').BedrockClient,
  history: HistoryMessage[],
  system: string,
  stream: boolean,
  modelId: string,
): Promise<string> {
  const messages = toBedrockMessages(history);
  printWaiting(modelId);

  if (stream) {
    let text = '';
    process.stdout.write('assistant> ');
    for await (const event of client.converseStream({ system, messages })) {
      if (event.type === 'text_delta') {
        process.stdout.write(event.text);
        text += event.text;
      } else if (event.type === 'error') {
        throw event.error;
      } else if (event.type === 'message_stop') {
        text = event.outputText || text;
        if (event.toolUses.length > 0) {
          console.warn(
            `\n[warn] Model requested tools (${event.toolUses.map((t) => t.name).join(', ')}); this CLI is text-only.`,
          );
        }
      }
    }
    process.stdout.write('\n');
    if (!text.trim()) {
      console.warn('[warn] Model returned no text. Try --no-stream or another BEDROCK_MODEL_ID.');
    }
    return text.trim();
  }

  const result = await client.converse({ system, messages });
  if (result.toolUses.length > 0) {
    console.warn(
      `[warn] Model requested tools (${result.toolUses.map((t) => t.name).join(', ')}); this CLI is text-only.`,
    );
  }
  const text = result.outputText.trim();
  if (!text) {
    console.warn(
      `[warn] Empty response (stopReason=${result.stopReason ?? 'unknown'}). Check model access in Bedrock.`,
    );
  } else {
    console.log(`assistant> ${text}`);
  }
  return text;
}

async function main(): Promise<void> {
  loadEnvFile(join(repoRoot, '.env'));
  loadEnvFile(join(repoRoot, 'apps/cricinsights/.env.local'));

  const debug = ['1', 'true', 'yes'].includes(
    process.env.BEDROCK_CHAT_DEBUG?.trim().toLowerCase() ?? '',
  );
  process.env.AI_AGENT_LOG = debug ? 'true' : 'false';

  const { question: oneShot, stream } = parseArgs(process.argv.slice(2));

  const {
    BedrockClient,
    getBedrockModelId,
    getBedrockRegion,
    isBedrockEnabled,
  } = await import('@cricket-ai/ai-agent');

  if (!isBedrockEnabled()) {
    console.error('BEDROCK_ENABLED is false. Set BEDROCK_ENABLED=true or unset it in .env');
    process.exit(1);
  }

  if (!hasAwsCredentials()) {
    console.error(
      'No AWS credentials found. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (and AWS_SESSION_TOKEN if temporary) or AWS_PROFILE in .env',
    );
    process.exit(1);
  }

  const modelId = getBedrockModelId();
  const region = getBedrockRegion();
  const system = process.env.BEDROCK_CHAT_SYSTEM?.trim() || DEFAULT_SYSTEM;

  console.log(`Bedrock chat — model=${modelId} region=${region}`);
  if (!oneShot) {
    console.log('Commands: /exit, /quit, /clear (reset history)\n');
  }

  const client = new BedrockClient();
  const history: HistoryMessage[] = [];

  if (oneShot) {
    history.push({ role: 'user', content: oneShot });
    try {
      const answer = await reply(client, history, system, stream, modelId);
      history.push({ role: 'assistant', content: answer });
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
    return;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'you> ',
    terminal: true,
  });

  let busy = false;

  const promptAgain = () => {
    if (!busy) rl.prompt();
  };

  rl.prompt();

  rl.on('line', (line) => {
    const input = line.trim();
    if (!input) {
      promptAgain();
      return;
    }

    if (input === '/exit' || input === '/quit') {
      rl.close();
      return;
    }

    if (input === '/clear') {
      history.length = 0;
      console.log('(history cleared)\n');
      promptAgain();
      return;
    }

    if (busy) {
      console.log('(still waiting for Bedrock — try again in a moment)\n');
      promptAgain();
      return;
    }

    busy = true;
    rl.pause();
    history.push({ role: 'user', content: input });

    void (async () => {
      try {
        const answer = await reply(client, history, system, stream, modelId);
        history.push({ role: 'assistant', content: answer });
      } catch (error) {
        history.pop();
        console.error(`\n${formatError(error)}\n`);
      } finally {
        busy = false;
        rl.resume();
        promptAgain();
      }
    })();
  });

  rl.on('close', () => {
    console.log('bye');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});
