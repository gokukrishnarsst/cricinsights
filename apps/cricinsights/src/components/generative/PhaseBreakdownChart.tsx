import type { UIComponent } from '@/types/generative-ui';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_THEME } from './chart-theme';

type PhaseItem = Extract<UIComponent, { type: 'phase_breakdown' }>;

export default function PhaseBreakdownChart({ data }: { data: PhaseItem }) {
  const chartData = data.phases.map((p) => ({
    phase: p.phase,
    runs: p.runs,
    sr: Math.round(p.strikeRate * 10) / 10,
  }));

  return (
    <div className="panel animate-fade-up p-5">
      {data.title ? <div className="eyebrow mb-4">{data.title}</div> : null}
      <div className="h-52 w-full">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis
              dataKey="phase"
              tick={{ fill: CHART_THEME.tick, fontSize: 11 }}
            />
            <YAxis tick={{ fill: CHART_THEME.tick, fontSize: 11 }} />
            <Tooltip contentStyle={CHART_THEME.tooltip} />
            <Bar
              dataKey="runs"
              name="Runs"
              fill={CHART_THEME.colors.secondary}
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="sr"
              name="Strike rate"
              fill={CHART_THEME.colors.accent}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
