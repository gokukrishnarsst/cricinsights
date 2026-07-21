import type { CSSProperties } from 'react';
import type { LeagueComparisonMetric } from '@/types/cricket';

export function LeagueMetricBars({
  metrics,
  leagueAShort,
  leagueBShort,
  animateDelivery,
}: {
  metrics: LeagueComparisonMetric[];
  leagueAShort: string;
  leagueBShort: string;
  /** When true, left bar uses delivery-line keyframe on first paint */
  animateDelivery?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-[0.2em]">
        <span className="text-accent">{leagueAShort}</span>
        <span className="text-accent-2">{leagueBShort}</span>
      </div>
      {metrics.map((m) => {
        const total = m.valueA + m.valueB;
        const pctA = total > 0 ? (m.valueA / total) * 100 : 50;
        return (
          <div key={m.label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-mono text-sm tabular-nums text-accent">
                {m.valueA}
                {m.unit === '%' ? '%' : ''}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">
                {m.label}
              </span>
              <span className="font-mono text-sm tabular-nums text-accent-2">
                {m.valueB}
                {m.unit === '%' ? '%' : ''}
              </span>
            </div>
            <div className="flex h-[7px] w-full gap-1 overflow-hidden rounded-full">
              <div
                className="rounded-full bg-gradient-to-r from-accent/60 to-accent"
                style={
                  animateDelivery
                    ? ({
                        width: `${pctA}%`,
                        boxShadow: '0 0 12px rgba(59,130,246,.4)',
                        animation: 'delivery-line 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        ['--target-width' as string]: `${pctA}%`,
                      } as CSSProperties)
                    : {
                        width: `${pctA}%`,
                        boxShadow: '0 0 12px rgba(59,130,246,.4)',
                      }
                }
              />
              <div
                className="flex-1 rounded-full bg-gradient-to-r from-accent-2 to-accent-2/60"
                style={{ boxShadow: '0 0 12px rgba(34,211,238,.3)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
