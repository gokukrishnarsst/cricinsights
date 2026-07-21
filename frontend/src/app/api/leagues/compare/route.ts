import { NextResponse } from "next/server";
import { getLeagueComparison, ApiError } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leagueA =
    searchParams.get("leagueA") === "The Hundred"
      ? ("The Hundred" as const)
      : ("IPL" as const);
  const leagueB =
    searchParams.get("leagueB") === "IPL"
      ? ("IPL" as const)
      : ("The Hundred" as const);

  try {
    const result = await getLeagueComparison({ leagueA, leagueB });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }
}
