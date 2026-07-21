"use client";

import type { UIComponent, UIComponentType } from "@/types/generative-ui";
import CricketPlayerCard from "@/components/cricket/CricketPlayerCard";
import ComparisonView from "@/components/cricket/ComparisonView";
import IntelligencePanel from "@/components/cricket/IntelligencePanel";
import CareerPanel from "@/components/cricket/CareerPanel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_THEME } from "./chart-theme";
import { DataScopeFromComponent } from "./DataScopeBanner";
import GenerativeSkeleton from "./GenerativeSkeleton";
import InsightCard from "./InsightCard";
import PhaseBreakdownChart from "./PhaseBreakdownChart";
import UnknownComponentFallback from "./UnknownComponentFallback";
import VenueInsightsCard from "./VenueInsightsCard";

function StatsTable({
  title,
  headers,
  rows,
}: {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line/80">
      {title && (
        <div className="border-b border-line/60 bg-surface-2/60 px-4 py-2.5">
          <span className="font-display text-sm font-bold tracking-wide text-ink">
            {title}
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2/40">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-mute"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-line/40 last:border-0 even:bg-ink/[0.02]"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-2.5 ${j === 0 ? "font-medium text-ink-soft" : "font-mono tabular-nums text-ink"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BarComparison({
  title,
  metric,
  values,
}: {
  title?: string;
  metric: string;
  values: { label: string; value: number }[];
}) {
  const max = Math.max(...values.map((v) => v.value), 1);

  return (
    <div className="panel p-5">
      {(title || metric) && (
        <div className="eyebrow mb-4">{title ?? metric}</div>
      )}
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <BarChart data={values} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis dataKey="label" tick={{ fill: CHART_THEME.tick, fontSize: 12 }} />
            <YAxis
              tick={{ fill: CHART_THEME.tick, fontSize: 12 }}
              domain={[0, Math.ceil(max * 1.1)]}
            />
            <Tooltip contentStyle={CHART_THEME.tooltip} />
            <Bar
              dataKey="value"
              name={metric}
              fill={CHART_THEME.colors.primary}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeagueComparisonViz({
  data,
  leagueA,
  leagueB,
}: {
  data: Extract<UIComponent, { type: "league_comparison" }>["data"];
  leagueA?: string;
  leagueB?: string;
}) {
  const labelA = leagueA ?? "IPL";
  const labelB = leagueB ?? "League B";

  const chartData = data.metrics.map((m) => ({
    metric: m.label,
    [labelA]: m.ipl,
    [labelB]: m.hundred,
  }));

  return (
    <div className="panel space-y-4 p-5 sm:p-6">
      <p className="text-sm leading-relaxed text-ink-soft">{data.summary}</p>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis
              dataKey="metric"
              tick={{ fill: CHART_THEME.tick, fontSize: 10 }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fill: CHART_THEME.tick, fontSize: 12 }} />
            <Tooltip contentStyle={CHART_THEME.tooltip} />
            <Legend />
            <Bar dataKey={labelA} fill={CHART_THEME.colors.secondary} radius={[4, 4, 0, 0]} />
            <Bar dataKey={labelB} fill={CHART_THEME.colors.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InsightGrid({
  items,
}: {
  items: { title: string; subtitle: string; prompt?: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <a
          key={item.title}
          href={item.prompt ? `/chat?q=${encodeURIComponent(item.prompt)}` : "/chat"}
          className="panel panel-hover block p-4"
        >
          <div className="font-display text-lg font-bold tracking-wide text-ink">
            {item.title}
          </div>
          <div className="mt-0.5 text-sm text-ink-soft">{item.subtitle}</div>
        </a>
      ))}
    </div>
  );
}

function RenderOne({ item }: { item: UIComponent }) {
  switch (item.type) {
    case "text":
      return <p className="leading-relaxed text-ink-soft">{item.content}</p>;

    case "stats_table":
      return (
        <StatsTable title={item.title} headers={item.headers} rows={item.rows} />
      );

    case "player_card":
      return (
        <div className="mx-auto max-w-[260px]">
          <CricketPlayerCard card={item.card} />
        </div>
      );

    case "comparison_card":
      if (!item.comparison?.playerA || !item.comparison?.playerB) {
        return (
          <GenerativeSkeleton variant="wide" />
        );
      }
      return (
        <div className="space-y-4">
          <ComparisonView comparison={item.comparison} variant="embedded" />
          {item.insights?.map((insight) => (
            <InsightCard
              key={insight.slice(0, 40)}
              title="Insight"
              content={insight}
              severity="info"
            />
          ))}
        </div>
      );

    case "radar_chart":
      return (
        <div className="panel p-5">
          {item.title && <div className="eyebrow mb-4">{item.title}</div>}
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <RadarChart data={item.data}>
                <PolarGrid stroke="rgba(14,21,38,.15)" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: CHART_THEME.tick, fontSize: 11 }}
                />
                <Radar
                  dataKey="value"
                  stroke={CHART_THEME.colors.accent}
                  fill={CHART_THEME.colors.accent}
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );

    case "bar_comparison":
      return (
        <BarComparison
          title={item.title}
          metric={item.metric}
          values={item.values}
        />
      );

    case "league_comparison":
      return (
        <LeagueComparisonViz
          data={item.data}
          leagueA={item.leagueA}
          leagueB={item.leagueB}
        />
      );

    case "insight_card":
      return (
        <InsightCard
          title={item.title}
          content={item.content}
          severity={item.severity}
        />
      );

    case "insight_grid":
      return <InsightGrid items={item.items} />;

    case "venue_insights":
      return <VenueInsightsCard data={item} />;

    case "phase_breakdown":
      return <PhaseBreakdownChart data={item} />;

    case "data_scope":
      return <DataScopeFromComponent item={item} />;

    case "strengths_gaps":
      if (!item.intelligence?.card) {
        return <GenerativeSkeleton variant="card" />;
      }
      return <IntelligencePanel intelligence={item.intelligence} />;

    case "career_stats":
      if (!item.career?.player) {
        return <GenerativeSkeleton variant="table" />;
      }
      return <CareerPanel career={item.career} />;

    default:
      return (
        <UnknownComponentFallback
          type={(item as { type: string }).type}
        />
      );
  }
}

/** Layout hint for chat — wide components break out of narrow bubbles. */
export function isWideGenerativeComponent(type: UIComponentType): boolean {
  return (
    type === "comparison_card" ||
    type === "league_comparison" ||
    type === "venue_insights"
  );
}

export default function GenerativeRenderer({
  data,
  loading,
}: {
  data?: UIComponent | UIComponent[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-4">
        <GenerativeSkeleton variant="wide" />
      </div>
    );
  }

  if (!data) return null;

  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return null;

  return (
    <div className="mt-4 space-y-6">
      {items.map((item, i) => (
        <div
          key={`${item.type}-${i}`}
          className="animate-rise-soft"
          data-ui-component={item.type}
        >
          <RenderOne item={item} />
        </div>
      ))}
    </div>
  );
}
