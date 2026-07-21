import { getMockPlayer } from "@/lib/db/mock-data";
import { getPlayerProfileTool } from "@/lib/mcp/tools";
import type { PlayerProfileResponse } from "@/types/api";
import type { LeagueCode, RatedPlayerCard } from "@/types/cricket";

const HERO_DUEL: { name: string; mockId: number }[] = [
  { name: "Virat Kohli", mockId: 101 },
  { name: "Abhishek Sharma", mockId: 102 },
];

async function loadHeroCard(
  name: string,
  mockId: number,
  league: LeagueCode,
): Promise<RatedPlayerCard | null> {
  const fallback = getMockPlayer(mockId, league);
  try {
    const result = await getPlayerProfileTool.handler({ name, league });

    if (result && typeof result === "object" && !("error" in result)) {
      const profile = result as PlayerProfileResponse | RatedPlayerCard;
      return "profile" in profile ? profile.profile : profile;
    }
  } catch (error) {
    console.warn(`[hero-players] live profile failed for ${name}:`, error);
  }

  return fallback;
}

export async function getHeroDuelCards(
  league: LeagueCode = "IPL",
): Promise<[RatedPlayerCard | null, RatedPlayerCard | null]> {
  const [heroA, heroB] = await Promise.all(
    HERO_DUEL.map(({ name, mockId }) => loadHeroCard(name, mockId, league)),
  );
  return [heroA, heroB];
}
