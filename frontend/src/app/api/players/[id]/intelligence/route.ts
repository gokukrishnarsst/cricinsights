import { NextResponse } from "next/server";
import { getPlayerIntelligenceTool } from "@/lib/mcp/tools";
import type { PlayerIntelligence } from "@/types/cricket";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league");
  const leagueCode =
    league === "The Hundred" ? ("The Hundred" as const) : ("IPL" as const);

  const result = await getPlayerIntelligenceTool.handler({
    player_id: playerId,
    league: leagueCode,
  });

  if (result && typeof result === "object" && "error" in result) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result as PlayerIntelligence);
}
