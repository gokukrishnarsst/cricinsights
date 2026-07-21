import type {
  LeagueComparisonResult,
  PlayerCareerReport,
  PlayerComparison,
  PlayerIntelligence,
  RatedPlayerCard,
} from "./cricket";

/** Severity for insight / data-scope banners. */
export type InsightSeverity = "info" | "warning" | "success" | "error";

/** All supported generative UI component type keys. */
export type UIComponentType =
  | "text"
  | "player_card"
  | "comparison_card"
  | "league_comparison"
  | "stats_table"
  | "radar_chart"
  | "bar_comparison"
  | "insight_card"
  | "insight_grid"
  | "venue_insights"
  | "phase_breakdown"
  | "data_scope"
  | "strengths_gaps"
  | "career_stats";

export type UIComponent =
  | { type: "text"; content: string }
  | { type: "player_card"; card: RatedPlayerCard }
  | {
      type: "comparison_card";
      /** Full compare_players payload (preferred). */
      comparison: PlayerComparison;
      insights?: string[];
    }
  | {
      type: "league_comparison";
      data: LeagueComparisonResult;
      /** Optional display names when fallback leagues were used. */
      leagueA?: string;
      leagueB?: string;
    }
  | {
      type: "stats_table";
      title?: string;
      headers: string[];
      rows: (string | number)[][];
    }
  | {
      type: "radar_chart";
      title?: string;
      data: { label: string; value: number }[];
      players?: string[];
    }
  | {
      type: "bar_comparison";
      title?: string;
      metric: string;
      values: { label: string; value: number }[];
    }
  | {
      type: "insight_card";
      title: string;
      content: string;
      severity?: InsightSeverity;
    }
  | {
      type: "insight_grid";
      items: { title: string; subtitle: string; prompt?: string }[];
    }
  | {
      type: "venue_insights";
      venue: { id: number; name: string; city?: string; capacity?: number };
      league?: string;
      summary: {
        matches: number;
        avgFirstInnings: number;
        avgSecondInnings: number;
        avgWickets: number;
        highestTeamScore: number;
      };
      topBatters?: { fullname: string; metric: string; value: number }[];
      topBowlers?: { fullname: string; metric: string; value: number }[];
    }
  | {
      type: "phase_breakdown";
      title?: string;
      phases: {
        phase: string;
        runs: number;
        balls: number;
        strikeRate: number;
      }[];
    }
  | {
      type: "data_scope";
      scope?: string;
      limitations?: string[];
      source?: string;
    }
  | {
      type: "strengths_gaps";
      intelligence: PlayerIntelligence;
    }
  | {
      type: "career_stats";
      career: PlayerCareerReport;
    };

/** Loose shape the LLM may emit before normalization. */
export type RawUIComponent = Record<string, unknown> & { type: string };

export interface CricInsightsResponse {
  text: string;
  ui?: UIComponent | UIComponent[];
  /** Optional metadata from agent / tools. */
  dataScope?: string;
  limitations?: string[];
  source?: string;
}

export const UI_COMPONENT_TYPES: UIComponentType[] = [
  "text",
  "player_card",
  "comparison_card",
  "league_comparison",
  "stats_table",
  "radar_chart",
  "bar_comparison",
  "insight_card",
  "insight_grid",
  "venue_insights",
  "phase_breakdown",
  "data_scope",
  "strengths_gaps",
  "career_stats",
];
