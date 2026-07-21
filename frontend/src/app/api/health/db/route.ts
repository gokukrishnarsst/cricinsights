import { NextResponse } from "next/server";
import { getDb, shouldUseMockData } from "@/lib/db";
import { sqlRow } from "@/lib/db/sql";
import { sql } from "drizzle-orm";

export async function GET() {
  const mockMode = shouldUseMockData();
  const hasUrl = Boolean(process.env.DATABASE_URL);

  if (mockMode || !hasUrl) {
    return NextResponse.json({
      connected: false,
      mockMode,
      hasDatabaseUrl: hasUrl,
      playerCount: null,
      message: mockMode
        ? "Using mock data (USE_MOCK_DATA=true or missing DATABASE_URL)"
        : "Database URL not configured",
    });
  }

  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({
        connected: false,
        mockMode: false,
        error: "Database client unavailable",
      });
    }

    const result = await db.execute(
      sql`SELECT COUNT(*)::int AS player_count FROM master.players`,
    );
    const row = sqlRow<{ player_count: number }>(result);

    return NextResponse.json({
      connected: true,
      mockMode: false,
      playerCount: Number(row?.player_count ?? 0),
      leagues: ["Indian Premier League", "The Hundred"],
      bedrockModel: process.env.BEDROCK_MODEL_ID ?? "nvidia.nemotron-nano-3-30b",
      awsRegion: process.env.AWS_REGION ?? "us-east-1",
    });
  } catch (e) {
    return NextResponse.json(
      {
        connected: false,
        mockMode: false,
        error: e instanceof Error ? e.message : "Database connection failed",
      },
      { status: 503 },
    );
  }
}
