'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendChartData } from './types';
import { CardHeader, GlassCard } from './primitives';
import { careerToTrendSeries, cn } from './utils';
import { CHART_THEME } from '@/components/generative/chart-theme';

interface TrendChartProps {
  data: TrendChartData;
  className?: string;
}

export function TrendChart({ data, className }: TrendChartProps) {
  const rawSeries = data.series ?? [];
  const chartData =
    rawSeries.length > 0 &&
    (rawSeries[0].season !== undefined ||
      rawSeries[0].seasonName !== undefined ||
      rawSeries[0].label !== undefined)
      ? rawSeries.map((point) => ({
          season: point.season ?? point.seasonName ?? point.label ?? '',
          runs: point.runs ?? point.value ?? 0,
          wickets: point.wickets ?? 0,
        }))
      : careerToTrendSeries(rawSeries as Parameters<typeof careerToTrendSeries>[0]);

  // Don't render empty trend shells in chat — they add visual noise.
  if (chartData.length === 0) return null;

  return (
    <GlassCard className={cn('p-4 sm:p-5', className)}>
      <CardHeader title={data.title ?? 'Trend'} subtitle="Season-over-season" />

      <div className="h-52 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_THEME.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="season"
              tick={{ fill: CHART_THEME.tick, fontSize: 11 }}
              axisLine={{ stroke: 'rgba(14,21,38,.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: CHART_THEME.tick, fontSize: 11 }}
              axisLine={{ stroke: 'rgba(14,21,38,.1)' }}
              tickLine={false}
            />
            <Tooltip contentStyle={CHART_THEME.tooltip} />
            <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.tick }} />
            <Line
              type="monotone"
              dataKey="runs"
              name="Runs"
              stroke={CHART_THEME.colors.accent}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_THEME.colors.accent }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="wickets"
              name="Wickets"
              stroke={CHART_THEME.colors.gold}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_THEME.colors.gold }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
