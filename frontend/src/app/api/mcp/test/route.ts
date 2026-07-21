import { NextResponse } from "next/server";
import {
  CORE_MCP_TOOLS,
  executeCoreTool,
  listCoreTools,
} from "@/lib/mcp/index";

const DEV_ONLY = process.env.NODE_ENV !== "production";

/** Known-good SportMonks IDs for quick manual checks. */
const EXAMPLES = {
  compare_players: {
    playerA_id: 46,
    playerB_id: 278,
    league: "IPL",
    context: "Virat Kohli vs Rohit Sharma",
  },
  search_players: { query: "Kohli", league: "IPL", limit: 5 },
  get_player_stats: {
    player_id: 46,
    league: "IPL",
    phase: "all",
    style: "batting",
  },
  compare_leagues: { leagueA: "IPL", leagueB: "The Hundred" },
  get_venue_insights: { venue_id: 46, league: "IPL" },
} as const;

function guardDev() {
  if (!DEV_ONLY) {
    return NextResponse.json(
      { error: "MCP test route is disabled in production" },
      { status: 404 },
    );
  }
  return null;
}

/**
 * GET /api/mcp/test — list tools + curl examples.
 * GET /api/mcp/test?tool=compare_players — run smoke example for one tool.
 * GET /api/mcp/test?smoke=true — run all core smoke examples.
 */
export async function GET(req: Request) {
  const blocked = guardDev();
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const tool = searchParams.get("tool");
  const smoke = searchParams.get("smoke") === "true";

  if (!tool && !smoke) {
    return NextResponse.json({
      message: "MCP manual test harness (dev only)",
      tools: listCoreTools(),
      examples: EXAMPLES,
      usage: {
        list: "GET /api/mcp/test",
        singleTool: "GET /api/mcp/test?tool=compare_players",
        allSmoke: "GET /api/mcp/test?smoke=true",
        customPost: 'POST /api/mcp/test  {"name":"compare_players","arguments":{...}}',
      },
      notes: [
        "Set USE_MOCK_DATA=false and DATABASE_URL in .env.local for live silver data.",
        "player_id values are SportMonks sportmonks_id (Kohli=46, Rohit=278).",
      ],
    });
  }

  if (smoke) {
    const results: Record<string, unknown> = {};
    for (const [name, args] of Object.entries(EXAMPLES)) {
      try {
        results[name] = await executeCoreTool(name, args);
      } catch (e) {
        results[name] = {
          error: e instanceof Error ? e.message : "Tool execution failed",
        };
      }
    }
    return NextResponse.json({ smoke: true, results });
  }

  if (!tool) {
    return NextResponse.json(
      { error: "Missing tool query param" },
      { status: 400 },
    );
  }

  const exampleArgs = EXAMPLES[tool as keyof typeof EXAMPLES];
  if (!exampleArgs) {
    return NextResponse.json(
      {
        error: `Unknown tool: ${tool}`,
        available: Object.keys(EXAMPLES),
      },
      { status: 400 },
    );
  }

  try {
    const result = await executeCoreTool(tool, exampleArgs);
    return NextResponse.json({
      tool,
      arguments: exampleArgs,
      result,
    });
  } catch (e) {
    return NextResponse.json(
      {
        tool,
        arguments: exampleArgs,
        error: e instanceof Error ? e.message : "Tool execution failed",
      },
      { status: 400 },
    );
  }
}

/**
 * POST /api/mcp/test — invoke any core MCP tool with custom arguments.
 * Body: { "name": "compare_players", "arguments": { ... } }
 */
export async function POST(req: Request) {
  const blocked = guardDev();
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const name = body?.name as string | undefined;
    const toolArgs = body?.arguments ?? body?.args;

    if (!name) {
      return NextResponse.json(
        { error: "Missing tool name. Use { name, arguments }." },
        { status: 400 },
      );
    }

    const known = CORE_MCP_TOOLS.some((t) => t.name === name);
    if (!known) {
      return NextResponse.json(
        {
          error: `Unknown core tool: ${name}`,
          coreTools: listCoreTools().map((t) => t.name),
          hint: "Extended tools (get_player_profile, search_web, …) use POST /api/mcp",
        },
        { status: 400 },
      );
    }

    const result = await executeCoreTool(name, toolArgs ?? {});
    return NextResponse.json({ tool: name, arguments: toolArgs, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tool execution failed" },
      { status: 400 },
    );
  }
}
