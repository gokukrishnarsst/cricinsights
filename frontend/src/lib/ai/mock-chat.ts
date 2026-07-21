import { hydrateChatResponse, isPlayerComparison } from "@/lib/ai/hydrate-response";
import type { CricInsightsResponse } from "@/types/generative-ui";
import type {
  LeagueCode,
  LeagueComparisonResult,
  PlayerCareerReport,
  PlayerComparison,
  PlayerIntelligence,
  PlayerSummary,
  RatedPlayerCard,
} from "@/types/cricket";
import {
  comparePlayersTool,
  getPlayerCareerTool,
  getPlayerIntelligenceTool,
  getPlayerProfileTool,
  getStandingsTool,
  getTopPerformersTool,
  searchPlayersTool,
} from "@/lib/mcp/tools";
import { compareLeaguesTool } from "@/lib/mcp/index";

/** Aliases → canonical seed player names (order matters: longer keys first). */
const PLAYER_ALIASES: { key: string; name: string }[] = [
  { key: "virat kohli", name: "Virat Kohli" },
  { key: "abhishek sharma", name: "Abhishek Sharma" },
  { key: "jasprit bumrah", name: "Jasprit Bumrah" },
  { key: "rohit sharma", name: "Rohit Sharma" },
  { key: "sanju samson", name: "Sanju Samson" },
  { key: "jos buttler", name: "Jos Buttler" },
  { key: "will jacks", name: "Will Jacks" },
  { key: "sam curran", name: "Sam Curran" },
  { key: "jordan cox", name: "Jordan Cox" },
  { key: "rashid khan", name: "Rashid Khan" },
  { key: "kohli", name: "Virat Kohli" },
  { key: "abhishek", name: "Abhishek Sharma" },
  { key: "bumrah", name: "Jasprit Bumrah" },
  { key: "rohit", name: "Rohit Sharma" },
  { key: "sanju", name: "Sanju Samson" },
  { key: "samson", name: "Sanju Samson" },
  { key: "buttler", name: "Jos Buttler" },
  { key: "jacks", name: "Will Jacks" },
  { key: "curran", name: "Sam Curran" },
  { key: "cox", name: "Jordan Cox" },
  { key: "rashid", name: "Rashid Khan" },
];

function resolveLeague(q: string): LeagueCode {
  return q.includes("hundred") ? "The Hundred" : "IPL";
}

function matchPlayers(q: string): string[] {
  const found: string[] = [];
  for (const { key, name } of PLAYER_ALIASES) {
    if (q.includes(key) && !found.includes(name)) found.push(name);
  }
  return found;
}

function phaseHint(q: string): string {
  if (q.includes("powerplay") || q.includes("power play")) return "powerplay";
  if (q.includes("death")) return "death overs";
  if (q.includes("middle")) return "middle overs";
  return "overall";
}

async function compareByNames(
  nameA: string,
  nameB: string,
  league: LeagueCode,
): Promise<PlayerComparison | null> {
  const searchA = await searchPlayersTool.handler({
    query: nameA,
    league,
    limit: 1,
  });
  const searchB = await searchPlayersTool.handler({
    query: nameB,
    league,
    limit: 1,
  });
  const a =
    searchA && typeof searchA === "object" && "results" in searchA
      ? (searchA as { results: { playerId: number }[] }).results[0]
      : undefined;
  const b =
    searchB && typeof searchB === "object" && "results" in searchB
      ? (searchB as { results: { playerId: number }[] }).results[0]
      : undefined;
  if (!a?.playerId || !b?.playerId) return null;

  const result = await comparePlayersTool.handler({
    playerA_id: a.playerId,
    playerB_id: b.playerId,
    league,
  });
  return isPlayerComparison(result) ? result : null;
}

function comparisonBlurb(
  comparison: PlayerComparison,
  phase: string,
): string {
  const { playerA, playerB, insight } = comparison;
  return `${playerA.player.fullname} vs ${playerB.player.fullname} — ${phase} comparison. ${insight}`;
}

/**
 * Fast chat path for demo mode (USE_MOCK_DATA=true): calls MCP tools directly,
 * no Bedrock round-trip. Typical response < 100ms.
 */
export async function mockChatResponse(
  query: string,
): Promise<CricInsightsResponse> {
  const q = query.toLowerCase();
  const league = resolveLeague(q);
  const players = matchPlayers(q);

  // ── Compare any two seeded players ──
  if (q.includes("compare") && players.length >= 2) {
    const comparison = await compareByNames(players[0], players[1], league);
    if (comparison) {
      const phase = phaseHint(q);
      return {
        text: comparisonBlurb(comparison, phase),
        ui: [{ type: "comparison_card", comparison }],
      };
    }
  }

  // ── Single-player intelligence ──
  if (
    players.length >= 1 &&
    (q.includes("strength") ||
      q.includes("weakness") ||
      q.includes("gap") ||
      q.includes("scout") ||
      q.includes("intelligence") ||
      q.includes("development") ||
      q.includes("analyze") ||
      q.includes("analyse"))
  ) {
    const intel = (await getPlayerIntelligenceTool.handler({
      name: players[0],
      league,
    })) as PlayerIntelligence | { error: string };
    if (!("error" in intel)) {
      return {
        text: intel.summary,
        ui: [{ type: "strengths_gaps", intelligence: intel }],
      };
    }
  }

  // ── Format / career stats ──
  if (
    players.length >= 1 &&
    (q.includes("test") ||
      q.includes("odi") ||
      q.includes("t20") ||
      q.includes("career") ||
      q.includes("international") ||
      q.includes("format"))
  ) {
    const career = (await getPlayerCareerTool.handler({
      name: players[0],
    })) as PlayerCareerReport | { error: string };
    if (!("error" in career)) {
      return {
        text: career.bioSummary,
        ui: [{ type: "career_stats", career }],
      };
    }
  }

  // ── Player profile card ──
  if (
    players.length === 1 &&
    (q.includes("profile") ||
      q.includes("card") ||
      q.includes("stats") ||
      q.includes("show") ||
      q.includes("tell me about"))
  ) {
    const res = (await getPlayerProfileTool.handler({
      name: players[0],
      league,
    })) as { profile?: RatedPlayerCard; error?: string } | RatedPlayerCard;
    const card =
      res && typeof res === "object" && "profile" in res && res.profile
        ? res.profile
        : res && typeof res === "object" && !("error" in res)
          ? (res as RatedPlayerCard)
          : null;
    if (card) {
      return {
        text: `${card.player.fullname} — ${card.archetype} (${card.overall} overall, ${card.tier} tier) in ${league}.`,
        ui: [{ type: "player_card", card }],
      };
    }
  }

  // ── League battle ──
  if (q.includes("ipl") && q.includes("hundred")) {
    const data = (await compareLeaguesTool.handler({
      leagueA: "IPL",
      leagueB: "The Hundred",
    })) as LeagueComparisonResult;
    return {
      text: data.summary,
      ui: [{ type: "league_comparison", data }],
    };
  }

  // ── Standings ──
  if (q.includes("standing") || q.includes("table") || q.includes("points")) {
    const rows = await getStandingsTool.handler({ league, limit: 6 });
    return {
      text: `${league} standings from seed data.`,
      ui: [
        {
          type: "stats_table",
          headers: ["Team", "Points", "NRR", "Pos"],
          rows: (rows as { team: string; points: number; nrr: number; position: number }[]).map(
            (r) => [r.team, r.points, r.nrr, r.position],
          ),
        },
      ],
    };
  }

  // ── Top performers ──
  const metric =
    q.includes("death") && q.includes("bowl")
      ? "economy"
      : q.includes("death")
        ? "death"
        : q.includes("powerplay") || q.includes("power play")
          ? "powerplay"
          : q.includes("strike") || q.includes("sr")
            ? "strike_rate"
            : null;

  if (metric) {
    const top = (await getTopPerformersTool.handler({
      metric,
      league,
      limit: 5,
    })) as RatedPlayerCard[];
    const label =
      metric === "economy"
        ? "Economy"
        : metric === "death"
          ? "Death Impact"
          : metric === "powerplay"
            ? "Powerplay"
            : "Strike Rate";
    const statKey =
      metric === "economy"
        ? "eco"
        : metric === "death"
          ? "dth"
          : metric === "powerplay"
            ? "pwr"
            : "bat";
    return {
      text: `Top ${label.toLowerCase()} performers in ${league}.`,
      ui: [
        {
          type: "bar_comparison",
          metric: label,
          values: top.map((c) => ({
            label: c.player.fullname.split(" ").pop() ?? c.player.fullname,
            value: c.stats[statKey],
          })),
        },
      ],
    };
  }

  // ── Default: suggest demo prompts ──
  return {
    text: "Try a comparison, player intelligence report, or career breakdown — powered by verified seed data.",
    ui: {
      type: "insight_grid",
      items: [
        {
          title: "Kohli vs Abhishek",
          subtitle: "Powerplay duel IPL",
          prompt: "Compare Virat Kohli and Abhishek Sharma in IPL powerplay",
        },
        {
          title: "Kohli intelligence",
          subtitle: "Strengths, gaps & benchmarks",
          prompt: "What are Virat Kohli's strengths and weaknesses in IPL?",
        },
        {
          title: "Bumrah career",
          subtitle: "Test, ODI, T20I & IPL",
          prompt: "Show Jasprit Bumrah Test ODI T20I and IPL career stats",
        },
        {
          title: "Hundred leaders",
          subtitle: "Buttler vs Cox",
          prompt: "Compare Jos Buttler and Jordan Cox in The Hundred",
        },
        {
          title: "League Battle",
          subtitle: "IPL vs The Hundred",
          prompt: "Compare IPL vs The Hundred key metrics",
        },
        {
          title: "Death Bowlers",
          subtitle: "Best in IPL",
          prompt: "Best death bowlers IPL",
        },
      ],
    },
  };
}

