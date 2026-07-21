# CricInsights system evaluation

Use this harness to **stress the real stack** (router → fast path → MCP → manifest → weakness rules) and see **where to invest**: router rules, local MCP, agent/hydration, or UI normalization.

## Quick start

From `cricket-ai/` (requires `.env` with `REMOTE_DATABASE_URL`):

```bash
pnpm eval:system
```

Options:

| Flag | Purpose |
|------|--------|
| `--json` | Also print full JSON to stdout |
| `--id scout-kohli-ipl,stats-kohli-ipl` | Run subset of scenarios |
| `--out path/to/report.json` | Custom JSON output path |

Exit code: `0` if no critical/high findings, `1` if any scenario failed checks, `2` on crash.

Reports are written to `apps/cricinsights/scripts/system-eval/reports/eval-<timestamp>.json`.

## What it tests today

| Layer | Covered | Not covered (yet) |
|-------|---------|-------------------|
| SmartRouter | ✅ route + intent | — |
| Fast path + MCP | ✅ execute + manifest | AI path / Bedrock (`--with-ai` TBD) |
| Manifest quality | ✅ empty highlights, tables, scout UI | Visual regression |

## Scenario catalog

Edit `scenarios.ts` to add queries your users actually ask. Each scenario can set:

- `expectRoute` / `expectIntent` — routing regression
- `expectComponents` — manifest shape
- `watchFor` — weakness detector codes

## Weakness codes → what to fix

| Code | Usually means |
|------|----------------|
| `ROUTE_MISMATCH` | Improve `smart-router.ts` or accept AI path |
| `EMPTY_HIGHLIGHTS` | Hydration / fast path / prompt for `player_card` |
| `EMPTY_STATS_TABLE` / `EMPTY_LEADERBOARD_TABLE` | Row normalization or tool-shaped manifests |
| `MISSING_SCOUT_UI` | `player_scout` fast path or `strengths_gaps` |
| `FAST_PATH_ERROR` | DB, tool args, missing season/league |
| `AI_WHEN_FAST_POSSIBLE` | Add `season_id` to router hints or local season resolution |

See `weakness-detector.ts` → `IMPROVEMENT_HINTS` for area tags: `router`, `mcp-local`, `agent`, `ui`, `data`.

## System strengths & weaknesses (baseline)

The eval run prints a static baseline list (architecture, not runtime). Update `run-eval.ts` as the product evolves.

### Strengths

- Fast path for factual queries (stats, compare, scout when matched)
- Aurora-backed career stats with consistent schema
- Manifest normalizers for LLM key drift

### Weaknesses

- Router gaps when `season_id` / complex phrasing → unnecessary AI path
- AI manifest quality still model-dependent
- No unified “intelligence” tool on local MCP like legacy frontend

## Extending the harness

1. **New scenarios** — copy a block in `scenarios.ts`, tag `critical` for CI.
2. **New detectors** — add a `WeaknessCode` and rule in `weakness-detector.ts`.
3. **AI path** — optional future: call `CricketAIAgent.chat()` with `BEDROCK_ENABLED=true` and reuse manifest detectors (costs $ + time).
4. **CI** — `pnpm eval:system -- --id scout-kohli-ipl,stats-kohli-ipl` on PRs with read-only DB secret.

## Decision guide: more MCP vs code vs limits

| Symptom in report | Likely lever |
|-------------------|--------------|
| Many `ROUTE_MISMATCH` / `AI_WHEN_FAST_POSSIBLE` | **Code** — router + fast path intents |
| `FAST_PATH_ERROR` on data queries | **Data/MCP-local** — DB, tool params |
| `EMPTY_*` with good fast path | **UI/agent** — normalization + hydration |
| AI-only scenarios fail (not in harness yet) | **Agent** — prompts, tool choice, iteration limit |

Adding **more MCP tools** helps when detectors show **missing capability** (e.g. phase splits, intelligence ratings), not when codes show **routing** or **schema mapping** issues — fix those in code first.
