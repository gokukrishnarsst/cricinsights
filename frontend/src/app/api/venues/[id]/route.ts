import { NextResponse } from "next/server";
import { getVenueInsights, ApiError } from "@/lib/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isFinite(venueId)) {
    return NextResponse.json({ error: "Invalid venue id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league");
  const leagueCode =
    league === "The Hundred"
      ? ("The Hundred" as const)
      : league === "IPL"
        ? ("IPL" as const)
        : undefined;

  try {
    const result = await getVenueInsights({
      venue_id: venueId,
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
