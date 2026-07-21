import { NextResponse } from "next/server";
import { getPlayerProfile, ApiError } from "@/lib/api";

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

  try {
    const result = await getPlayerProfile({
      player_id: playerId,
      league: leagueCode,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
