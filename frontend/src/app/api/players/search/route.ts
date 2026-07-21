import { NextResponse } from "next/server";
import { searchPlayersTool } from "@/lib/mcp/index";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const league = searchParams.get("league") as "IPL" | "The Hundred" | null;

  const result = await searchPlayersTool.handler({
    query: q,
    league: league ?? undefined,
    limit: 10,
    include_profile: false,
  });

  if (result && typeof result === "object" && "success" in result && result.success === false) {
    return NextResponse.json(result, { status: 404 });
  }

  const players =
    result && typeof result === "object" && "results" in result
      ? (result as { results: unknown }).results
      : result;

  return NextResponse.json({ players, meta: result });
}
