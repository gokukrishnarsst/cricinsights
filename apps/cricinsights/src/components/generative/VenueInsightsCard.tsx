import type { UIComponent } from '@/types/generative-ui';
import { MapPin } from 'lucide-react';
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

type VenueItem = Extract<UIComponent, { type: 'venue_insights' }>;

export default function VenueInsightsCard({ data }: { data: VenueItem }) {
  const chartData = [
    {
      label: '1st inn',
      value: Math.round(data.summary.avgFirstInnings * 10) / 10,
    },
    {
      label: '2nd inn',
      value: Math.round(data.summary.avgSecondInnings * 10) / 10,
    },
    {
      label: 'Wickets',
      value: Math.round(data.summary.avgWickets * 10) / 10,
    },
  ];

  return (
    <div className="panel animate-fade-up space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
          <MapPin size={18} className="text-accent-2" />
        </span>
        <div>
          <h3 className="font-display text-xl font-bold tracking-wide text-ink">
            {data.venue.name}
          </h3>
          <p className="text-sm text-ink-soft">
            {[data.venue.city, data.league].filter(Boolean).join(' · ')}
            {data.summary.matches > 0 && ` · ${data.summary.matches} matches`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['1st inn avg', data.summary.avgFirstInnings],
          ['2nd inn avg', data.summary.avgSecondInnings],
          ['Avg wickets', data.summary.avgWickets],
          ['High score', data.summary.highestTeamScore],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-line/60 bg-surface-2/40 px-3 py-2"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">
              {label}
            </div>
            <div className="font-mono text-lg tabular-nums text-ink">
              {Math.round(Number(val) * 10) / 10}
            </div>
          </div>
        ))}
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_THEME.tick, fontSize: 11 }}
            />
            <YAxis tick={{ fill: CHART_THEME.tick, fontSize: 11 }} />
            <Tooltip contentStyle={CHART_THEME.tooltip} />
            <Bar
              dataKey="value"
              fill={CHART_THEME.colors.primary}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.topBatters?.length || data.topBowlers?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.topBatters && data.topBatters.length > 0 ? (
            <div>
              <div className="eyebrow mb-2">Top batters</div>
              <ul className="space-y-1.5 text-sm">
                {data.topBatters.slice(0, 3).map((p) => (
                  <li
                    key={p.fullname}
                    className="flex justify-between text-ink-dim"
                  >
                    <span>{p.fullname}</span>
                    <span className="font-mono tabular-nums text-accent-2">
                      {p.value} {p.metric}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.topBowlers && data.topBowlers.length > 0 ? (
            <div>
              <div className="eyebrow mb-2">Top bowlers</div>
              <ul className="space-y-1.5 text-sm">
                {data.topBowlers.slice(0, 3).map((p) => (
                  <li
                    key={p.fullname}
                    className="flex justify-between text-ink-dim"
                  >
                    <span>{p.fullname}</span>
                    <span className="font-mono tabular-nums text-accent">
                      {p.value} {p.metric}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
