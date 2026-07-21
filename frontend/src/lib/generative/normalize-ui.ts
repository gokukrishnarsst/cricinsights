import type {
  LeagueComparisonResult,
  PlayerComparison,
  RatedPlayerCard,
} from "@/types/cricket";
import type {
  CricInsightsResponse,
  RawUIComponent,
  UIComponent,
} from "@/types/generative-ui";
import { isPlayerComparison } from "@/lib/ai/hydrate-response";

function isRatedCard(v: unknown): v is RatedPlayerCard {
  return (
    !!v &&
    typeof v === "object" &&
    "player" in v &&
    "stats" in v &&
    "overall" in v
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

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Coerce loose LLM/tool JSON into canonical UIComponent shapes.
 */
export function normalizeUIComponent(raw: unknown): UIComponent | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  const item = raw as RawUIComponent;
  const type = String(item.type);

  switch (type) {
    case "text":
      if (typeof item.content === "string") {
        return { type: "text", content: item.content };
      }
      return null;

    case "player_card": {
      const card =
        (isRatedCard(item.card) && item.card) ||
        (isRatedCard(item.player) && item.player) ||
        null;
      return card ? { type: "player_card", card } : null;
    }

    case "comparison_card": {
      if (isPlayerComparison(item.comparison)) {
        return {
          type: "comparison_card",
          comparison: item.comparison,
          insights: asArray(item.insights as string | string[] | undefined).filter(
            Boolean,
          ),
        };
      }
      return null;
    }

    case "league_comparison": {
      if (isLeagueComparison(item.data)) {
        return {
          type: "league_comparison",
          data: item.data,
          leagueA: item.leagueA as string | undefined,
          leagueB: item.leagueB as string | undefined,
        };
      }
      if (Array.isArray(item.metrics)) {
        return {
          type: "league_comparison",
          data: {
            metrics: item.metrics as LeagueComparisonResult["metrics"],
            summary:
              typeof item.summary === "string"
                ? item.summary
                : `${item.leagueA ?? "League A"} vs ${item.leagueB ?? "League B"}`,
          },
          leagueA: item.leagueA as string | undefined,
          leagueB: item.leagueB as string | undefined,
        };
      }
      return null;
    }

    case "stats_table":
      if (Array.isArray(item.headers) && Array.isArray(item.rows)) {
        return {
          type: "stats_table",
          title: item.title as string | undefined,
          headers: item.headers as string[],
          rows: item.rows as (string | number)[][],
        };
      }
      return null;

    case "bar_comparison":
      if (typeof item.metric === "string" && Array.isArray(item.values)) {
        return {
          type: "bar_comparison",
          title: item.title as string | undefined,
          metric: item.metric,
          values: item.values as { label: string; value: number }[],
        };
      }
      if (typeof item.title === "string" && Array.isArray(item.data)) {
        return {
          type: "bar_comparison",
          title: item.title,
          metric: item.title,
          values: item.data as { label: string; value: number }[],
        };
      }
      return null;

    case "radar_chart":
      if (Array.isArray(item.data)) {
        return {
          type: "radar_chart",
          title: item.title as string | undefined,
          data: item.data as { label: string; value: number }[],
          players: item.players as string[] | undefined,
        };
      }
      return null;

    case "insight_card":
      if (typeof item.title === "string" && typeof item.content === "string") {
        return {
          type: "insight_card",
          title: item.title,
          content: item.content,
          severity: item.severity as UIComponent extends { type: "insight_card" }
            ? UIComponent["severity"]
            : undefined,
        };
      }
      return null;

    case "insight_grid":
      if (Array.isArray(item.items)) {
        return {
          type: "insight_grid",
          items: item.items as {
            title: string;
            subtitle: string;
            prompt?: string;
          }[],
        };
      }
      return null;

    case "venue_insights":
      if (item.venue && item.summary) {
        return {
          type: "venue_insights",
          venue: item.venue as UIComponent extends { type: "venue_insights" }
            ? UIComponent["venue"]
            : never,
          league: item.league as string | undefined,
          summary: item.summary as UIComponent extends { type: "venue_insights" }
            ? UIComponent["summary"]
            : never,
          topBatters: item.topBatters as UIComponent extends {
            type: "venue_insights";
          }
            ? UIComponent["topBatters"]
            : undefined,
          topBowlers: item.topBowlers as UIComponent extends {
            type: "venue_insights";
          }
            ? UIComponent["topBowlers"]
            : undefined,
        };
      }
      return null;

    case "phase_breakdown":
      if (Array.isArray(item.phases)) {
        return {
          type: "phase_breakdown",
          title: item.title as string | undefined,
          phases: item.phases as UIComponent extends { type: "phase_breakdown" }
            ? UIComponent["phases"]
            : never,
        };
      }
      return null;

    case "data_scope":
      return {
        type: "data_scope",
        scope: item.scope as string | undefined,
        limitations: item.limitations as string[] | undefined,
        source: item.source as string | undefined,
      };

    case "strengths_gaps":
      if (item.intelligence && typeof item.intelligence === "object") {
        return {
          type: "strengths_gaps",
          intelligence:
            item.intelligence as UIComponent extends { type: "strengths_gaps" }
              ? UIComponent["intelligence"]
              : never,
        };
      }
      return null;

    case "career_stats":
      if (item.career && typeof item.career === "object") {
        return {
          type: "career_stats",
          career: item.career as UIComponent extends { type: "career_stats" }
            ? UIComponent["career"]
            : never,
        };
      }
      return null;

    default:
      return null;
  }
}

export function normalizeUIList(
  ui?: CricInsightsResponse["ui"],
): UIComponent[] {
  return asArray(ui)
    .map((item) => normalizeUIComponent(item))
    .filter((item): item is UIComponent => item !== null);
}

export function packUI(items: UIComponent[]): CricInsightsResponse["ui"] {
  if (items.length === 0) return undefined;
  return items.length === 1 ? items[0] : items;
}

/** Build stats_table from get_player_stats-like payload. */
export function statsTableFromPlayerStats(output: unknown): UIComponent | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const batting = o.batting as Record<string, number> | null;
  if (!batting) return null;
  return {
    type: "stats_table",
    title: `${o.fullname ?? "Player"} — ${o.league ?? "stats"}`,
    headers: ["Metric", "Value"],
    rows: [
      ["Runs", batting.runs ?? 0],
      ["Balls", batting.balls ?? 0],
      ["Average", Math.round((batting.average ?? 0) * 10) / 10],
      ["Strike rate", Math.round((batting.strikeRate ?? 0) * 10) / 10],
      ["Fours", batting.fours ?? 0],
      ["Sixes", batting.sixes ?? 0],
    ],
  };
}

/** Build phase_breakdown from get_player_stats phases array. */
export function phaseBreakdownFromStats(output: unknown): UIComponent | null {
  if (!output || typeof output !== "object") return null;
  const phases = (output as { phases?: unknown }).phases;
  if (!Array.isArray(phases) || phases.length === 0) return null;
  return {
    type: "phase_breakdown",
    title: "Phase splits",
    phases: phases.map((p) => {
      const row = p as Record<string, unknown>;
      return {
        phase: String(row.phase ?? "unknown"),
        runs: Number(row.runs ?? 0),
        balls: Number(row.balls ?? 0),
        strikeRate: Number(row.strikeRate ?? 0),
      };
    }),
  };
}

export function comparisonToInsightCards(
  comparison: PlayerComparison,
): UIComponent[] {
  const cards: UIComponent[] = [];
  if (comparison.insight) {
    cards.push({
      type: "insight_card",
      title: "Matchup insight",
      content: comparison.insight,
      severity: "info",
    });
  }
  return cards;
}
