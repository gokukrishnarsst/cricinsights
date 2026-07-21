# Chat API benchmark

Exercises the running `POST /api/chat` endpoint with 30 easy-to-extreme natural-language questions. It measures browser-visible first response time, total completion time, route, intent, tool calls, response completion, and failures.

Start the web app first, then run from the repository root:

```bash
pnpm dev:web
pnpm eval:chat
```

Options:

```bash
pnpm eval:chat -- --base-url http://localhost:3000 --timeout-ms 60000
pnpm eval:chat -- --levels easy,moderate
pnpm eval:chat -- --id easy-ipl-winner
pnpm eval:chat -- --out /tmp/chat-report.json --markdown-out /tmp/chat-report.md
```

Reports are written to `reports/` as JSON and Markdown. The benchmark is sequential by design so Bedrock and database latency measurements remain attributable to each question.
