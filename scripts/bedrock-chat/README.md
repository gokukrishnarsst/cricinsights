# Bedrock terminal chat

Simple REPL to test `BEDROCK_MODEL_ID` and AWS credentials without running the Next.js app.

## Setup

1. Configure root `.env` (see `.env.example`): `BEDROCK_MODEL_ID`, `AWS_REGION`, and AWS keys or profile.
2. Build the ai-agent library once:

```bash
pnpm nx run ai-agent:build
```

## Run

```bash
pnpm bedrock:chat
```

One-shot question:

```bash
pnpm bedrock:chat -- "Explain cricket powerplay rules in two sentences"
```

Default is **non-streaming** (more reliable in the terminal). Use `--stream` for token streaming.

```bash
pnpm bedrock:chat -- --stream
```

If you see no reply for a long time, the CLI now prints `assistant> (calling Bedrock…)` first. Large models (e.g. Mistral Large 675B) can take minutes. Set `BEDROCK_REQUEST_TIMEOUT_MS=300000` to allow longer waits.

**Common fixes**

- Refresh **expired** `AWS_SESSION_TOKEN` in `.env`
- In AWS Console → Bedrock → **Model access**, enable your model in `ap-southeast-2`
- Try a faster model id, e.g. `amazon.nova-lite-v1:0`
- `BEDROCK_CHAT_DEBUG=1 pnpm bedrock:chat` for detailed agent logs

This CLI does **not** call cricket MCP tools — only plain Bedrock Converse chat.
