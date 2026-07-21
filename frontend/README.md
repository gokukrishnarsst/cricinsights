# CricInsights Frontend

Copyable Next.js frontend for the CricInsights architecture.

## Expected directory layout

Place this folder beside the architecture folder:

```text
your-project/
├── frontend/
└── Initial Architecture/
    └── lib/
```

The link is configured in `tsconfig.json`:

```json
"@architecture/*": ["../Initial Architecture/lib/*"]
```

If your architecture folder has another name or location, update that path.

## Run

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`USE_MOCK_DATA=true` runs the UI without database or AWS credentials.

For live data and agent chat, put these server-side values in `.env.local`:

- `USE_MOCK_DATA=false`
- `DATABASE_URL`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `BEDROCK_MODEL_ID`

Never commit or share `.env.local`.

## Integration boundary

- `src/app/` — pages and frontend API routes
- `src/components/` — UI components
- `src/lib/api`, `mcp`, `db`, `scoring` — thin re-exports from `@architecture`
- `src/lib/agent/` — architecture agent integration plus frontend Generative UI
- `src/lib/ai/`, `src/lib/generative/` — frontend response hydration/rendering
