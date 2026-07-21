import type {
  LeagueComparisonResult,
  PlayerCareerReport,
  PlayerComparison,
  PlayerIntelligence,
  RatedPlayerCard,
} from "@/types/cricket";
import type { CricInsightsResponse, UIComponent } from "@/types/generative-ui";
import {
  comparisonToInsightCards,
  normalizeUIComponent,
  normalizeUIList,
  packUI,
  phaseBreakdownFromStats,
  statsTableFromPlayerStats,
} from "@/lib/generative/normalize-ui";

type ToolResultLike = {
  type?: string;
  toolName?: string;
  output?: unknown;
};

export function isPlayerComparison(v: unknown): v is PlayerComparison {
  return (
    !!v &&
    typeof v === "object" &&
    "playerA" in v &&
    "playerB" in v &&
    "rows" in v &&
    !!(v as PlayerComparison).playerA &&
    !!(v as PlayerComparison).playerB
  );
}

function isRatedCard(v: unknown): v is RatedPlayerCard {
  return (
    !!v &&
    typeof v === "object" &&
    "player" in v &&
    "stats" in v &&
    "overall" in v
  );
}

function isCareerReport(v: unknown): v is PlayerCareerReport {
  return (
    !!v &&
    typeof v === "object" &&
    "formatStats" in v &&
    "player" in v &&
    !!(v as PlayerCareerReport).player
  );
}

function isIntelligence(v: unknown): v is PlayerIntelligence {
  return (
    !!v &&
    typeof v === "object" &&
    "card" in v &&
    "strengths" in v &&
    "gaps" in v &&
    isRatedCard((v as PlayerIntelligence).card)
  );
}

function isLeagueComparison(v: unknown): v is LeagueComparisonResult {
  return (
    !!v &&
    typeof v === "object" &&
    "metrics" in v &&
    Array.isArray((v as LeagueComparisonResult).metrics)
  );
}

function isVenueInsights(v: unknown): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    "venue" in v &&
    "summary" in v &&
    !!(v as { venue: unknown }).venue
  );
}

function extractRatedCard(output: unknown): RatedPlayerCard | undefined {
  if (isRatedCard(output)) return output;
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (isRatedCard(o.card)) return o.card;
    if (isRatedCard(o.profile)) return o.profile;
  }
  return undefined;
}

function extractToolOutputs(toolResults: ToolResultLike[]) {
  const outputs = toolResults
    .filter((t) => t.type === "tool-result" && t.output != null)
    .map((t) => ({ name: t.toolName ?? "", output: t.output }));

  const comparison = outputs
    .filter((t) => t.name === "compare_players")
    .map((t) => t.output)
    .find(isPlayerComparison);

  const playerStats = outputs
    .filter((t) => t.name === "get_player_stats")
    .map((t) => t.output)
    .find((v) => v && typeof v === "object");

  const playerCard =
    outputs
      .filter(
        (t) =>
          t.name === "get_player_profile" ||
          t.name === "get_player_stats" ||
          t.name === "search_players",
      )
      .map((t) => extractRatedCard(t.output))
      .find(Boolean) ?? extractRatedCard(playerStats);

  const leagueComparison = outputs
    .filter(
      (t) => t.name === "compare_leagues" || t.name === "get_league_comparison",
    )
    .map((t) => t.output)
    .find(isLeagueComparison);

  const venueInsights = outputs
    .filter((t) => t.name === "get_venue_insights")
    .map((t) => t.output)
    .find(isVenueInsights);

  const topPerformers = outputs
    .filter((t) => t.name === "get_top_performers")
    .map((t) => t.output)
    .find((v): v is RatedPlayerCard[] => Array.isArray(v) && v.every(isRatedCard));

  const intelligence = outputs
    .filter((t) => t.name === "get_player_intelligence")
    .map((t) => t.output)
    .find(isIntelligence);

  const career = outputs
    .filter((t) => t.name === "get_player_career")
    .map((t) => t.output)
    .find(isCareerReport);

  const limitations = outputs
    .flatMap((t) => {
      const o = t.output as { limitations?: string[] } | undefined;
      return o?.limitations ?? [];
    })
    .filter(Boolean);

  const dataScopes = outputs
    .map((t) => (t.output as { dataScope?: string })?.dataScope)
    .filter(Boolean) as string[];

  return {
    comparison,
    playerCard,
    playerStats,
    leagueComparison,
    venueInsights,
    topPerformers,
    intelligence,
    career,
    limitations: [...new Set(limitations)],
    dataScope: dataScopes.join(" | "),
  };
}

function mergeComponent(
  item: UIComponent,
  tools: ReturnType<typeof extractToolOutputs>,
): UIComponent | null {
  switch (item.type) {
    case "comparison_card": {
      const comparison = isPlayerComparison(item.comparison)
        ? item.comparison
        : tools.comparison;
      if (!comparison) return null;
      return {
        type: "comparison_card",
        comparison,
        insights: item.insights,
      };
    }
    case "player_card": {
      const card = isRatedCard(item.card) ? item.card : tools.playerCard;
      return card ? { type: "player_card", card } : null;
    }
    case "league_comparison": {
      const data = isLeagueComparison(item.data)
        ? item.data
        : tools.leagueComparison;
      return data
        ? {
            type: "league_comparison",
            data,
            leagueA: item.leagueA,
            leagueB: item.leagueB,
          }
        : null;
    }
    case "venue_insights":
      if (tools.venueInsights) {
        const normalized = normalizeUIComponent({
          type: "venue_insights",
          ...tools.venueInsights,
        });
        if (normalized) return normalized;
      }
      return item;
    case "strengths_gaps": {
      const intelligence = isIntelligence(item.intelligence)
        ? item.intelligence
        : tools.intelligence;
      return intelligence ? { type: "strengths_gaps", intelligence } : null;
    }
    case "career_stats": {
      const career = isCareerReport(item.career) ? item.career : tools.career;
      return career ? { type: "career_stats", career } : null;
    }
    default:
      return item;
  }
}

/**
 * Bedrock models often emit partial UI shells. Re-attach tool payloads and
 * synthesize components when the model omits them.
 */
export function hydrateChatResponse(
  response: CricInsightsResponse,
  toolResults: ToolResultLike[] = [],
): CricInsightsResponse {
  const tools = extractToolOutputs(toolResults);
  const items: UIComponent[] = [];

  for (const raw of normalizeUIList(response.ui)) {
    const merged = mergeComponent(raw, tools);
    if (merged) items.push(merged);
  }

  if (!items.some((i) => i.type === "comparison_card") && tools.comparison) {
    items.unshift({ type: "comparison_card", comparison: tools.comparison });
    items.push(...comparisonToInsightCards(tools.comparison));
  }
  if (!items.some((i) => i.type === "player_card") && tools.playerCard) {
    items.push({ type: "player_card", card: tools.playerCard });
  }
  if (
    !items.some((i) => i.type === "stats_table") &&
    tools.playerStats
  ) {
    const table = statsTableFromPlayerStats(tools.playerStats);
    if (table) items.push(table);
  }
  if (
    !items.some((i) => i.type === "phase_breakdown") &&
    tools.playerStats
  ) {
    const phases = phaseBreakdownFromStats(tools.playerStats);
    if (phases) items.push(phases);
  }
  if (
    !items.some((i) => i.type === "league_comparison") &&
    tools.leagueComparison
  ) {
    items.push({ type: "league_comparison", data: tools.leagueComparison });
  }
  if (!items.some((i) => i.type === "venue_insights") && tools.venueInsights) {
    const venue = normalizeUIComponent({
      type: "venue_insights",
      ...tools.venueInsights,
    });
    if (venue) items.push(venue);
  }
  if (!items.some((i) => i.type === "strengths_gaps") && tools.intelligence) {
    items.push({ type: "strengths_gaps", intelligence: tools.intelligence });
  }
  if (!items.some((i) => i.type === "career_stats") && tools.career) {
    items.push({ type: "career_stats", career: tools.career });
  }
  if (
    !items.some((i) => i.type === "bar_comparison") &&
    tools.topPerformers?.length
  ) {
    items.push({
      type: "bar_comparison",
      title: "Top performers",
      metric: "Overall rating",
      values: tools.topPerformers.map((c) => ({
        label: c.player.fullname.split(" ").pop() ?? c.player.fullname,
        value: c.overall,
      })),
    });
  }

  const scope =
    response.dataScope ?? tools.dataScope ?? undefined;
  const limitations = [
    ...new Set([...(response.limitations ?? []), ...tools.limitations]),
  ];

  if (
    (scope || limitations.length > 0) &&
    !items.some((i) => i.type === "data_scope")
  ) {
    items.push({
      type: "data_scope",
      scope,
      limitations,
      source: response.source,
    });
  }

  return {
    ...response,
    dataScope: scope,
    limitations: limitations.length ? limitations : undefined,
    ui: packUI(items),
  };
}
