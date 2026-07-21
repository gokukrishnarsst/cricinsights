import { NextResponse } from "next/server";
import { getTeamStats, ApiError } from "@/lib/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league");
  const leagueCode =
    league === "The Hundred" ? ("The Hundred" as const) : undefined;
  const opponentId = searchParams.get("opponent_id");

  try {
    const result = await getTeamStats({
      team_id: teamId,
      league: leagueCode ?? (league === "IPL" ? "IPL" : undefined),
      opponent_id: opponentId ? Number(opponentId) : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
