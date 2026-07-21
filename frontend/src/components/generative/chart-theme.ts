/** Shared Recharts styling for generative UI (dark ER-diagram aesthetic). */
export const CHART_THEME = {
  grid: "rgba(14,21,38,.1)",
  tick: "#5a6885",
  tooltip: {
    background: "#0e1526",
    border: "1px solid rgba(34,211,238,.2)",
    borderRadius: 8,
    color: "#e8edf7",
    boxShadow: "0 12px 32px -8px rgba(0,0,0,.45)",
  },
  colors: {
    primary: "#0891b2",
    secondary: "#2563eb",
    accent: "#22d3ee",
    gold: "#f59e0b",
  },
} as const;
