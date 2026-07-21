'use client';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { PlayerIntelligence } from '@/types/cricket';

function ModelledTag() {
  return (
    <span className="ml-1.5 rounded border border-line bg-surface-2 px-1 py-px align-middle text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
      modelled
    </span>
  );
}

function RatingPill({ value }: { value: number }) {
  const tone =
    value >= 70 ? 'text-emerald' : value >= 40 ? 'text-gold' : 'text-rose';
  return (
    <span className={`font-display text-[15px] font-black tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: typeof Activity;
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={15} className={tint} />
        <h3 className="font-display text-[15px] font-bold tracking-[0.06em]">
          {title.toUpperCase()}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function IntelligencePanel({
  intelligence,
}: {
  intelligence: PlayerIntelligence;
}) {
  const { strengths, gaps, phases, benchmarks, benchmarkScope, form, summary } =
    intelligence;

  return (
    <section className="mt-10">
      <div className="mb-6">
        <div className="eyebrow mb-2 !text-emerald">Player Intelligence</div>
        <p className="max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          {summary}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ShieldCheck} title="Top Strengths" tint="text-emerald">
          <ul className="space-y-3">
            {strengths.map((s) => (
              <li key={s.key} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-ink">
                    {s.label}
                    {s.modelled && <ModelledTag />}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-ink-soft">
                    {s.evidence}
                  </div>
                </div>
                <RatingPill value={s.rating} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          icon={AlertTriangle}
          title="Development Areas"
          tint="text-rose"
        >
          <ul className="space-y-3">
            {gaps.map((g) => (
              <li key={g.key} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-ink">
                    {g.label}
                    {g.modelled && <ModelledTag />}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-ink-soft">
                    {g.evidence}
                  </div>
                </div>
                <RatingPill value={g.rating} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={BarChart3} title="Phase Impact" tint="text-accent-2">
          <div className="space-y-4">
            {phases.map((p) => (
              <div key={p.phase}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    {p.phase}
                    {p.modelled && <ModelledTag />}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-ink">
                    SR {p.strikeRate} · {p.runShare}% of runs
                  </span>
                </div>
                <div className="h-[7px] w-full overflow-hidden rounded-full bg-ink/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                    style={{ width: `${Math.min(p.runShare, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-ink-faint">
              Phase splits are modelled from career ratios until ball-by-ball data
              is available.
            </p>
          </div>
        </SectionCard>

        <SectionCard icon={TrendingUp} title="Elite Benchmarking" tint="text-gold">
          <div className="space-y-4">
            {benchmarks.map((b) => (
              <div key={b.metric}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    {b.metric}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-ink">
                    {b.value}
                    {b.percentile !== null && (
                      <span className="ml-2 text-gold">P{b.percentile}</span>
                    )}
                  </span>
                </div>
                <div className="h-[7px] w-full overflow-hidden rounded-full bg-ink/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold"
                    style={{ width: `${b.percentile ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <div className="flex items-center gap-2 text-[12px] text-ink-soft">
                <Activity size={13} className="text-accent-2" />
                Form {form.index} · Consistency {form.consistency}
              </div>
              <span className="text-[11px] text-ink-faint">{benchmarkScope}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
