import { NextResponse } from "next/server";
import { comparePlayers, ApiError } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const result = await comparePlayers({
      playerA_id: body.playerA_id,
      playerB_id: body.playerB_id,
      league: body.league ?? "IPL",
      context: body.context,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
