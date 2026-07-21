'use client';

import { useMemo } from 'react';
import type { ComparisonCardData, PlayerProfile } from './types';
import type { PlayerBattingTotals, PlayerBowlingTotals } from '@/lib/player-compare';
import { enrichPlayerComparisonData } from '@/lib/player-compare';
import { CardHeader, GlassCard, PlayerAvatar } from './primitives';
import {
  cn,
  diffTone,
  entityName,
  formatNumber,
  statNum,
  surfaceInset,
} from './utils';

interface ComparisonCardProps {
  data: ComparisonCardData;
  className?: string;
}

function buildMetrics(data: ComparisonCardData) {
  const diff = data.diff ?? {};
  const metrics: { label: string; a: number; b: number; leader?: string }[] = [];
  if (diff.battingRuns) {
    metrics.push({
      label: 'Total runs',
      a: Number(diff.battingRuns.a) || 0,
      b: Number(diff.battingRuns.b) || 0,
      leader: String(diff.battingRuns.leader ?? ''),
    });
  }
  if (diff.bowlingWickets) {
    metrics.push({
      label: 'Wickets',
      a: Number(diff.bowlingWickets.a) || 0,
      b: Number(diff.bowlingWickets.b) || 0,
      leader: String(diff.bowlingWickets.leader ?? ''),
    });
  }
  return metrics;
}

function fmtVal(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (decimals > 0) return Number(n).toFixed(decimals);
  return formatNumber(n);
}

function CompareTable({
  title,
  rows,
  nameA,
  nameB,
}: {
  title: string;
  rows: { label: string; a: string; b: string }[];
  nameA: string;
  nameB: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className={cn(surfaceInset, 'overflow-hidden')}>
      <div className="border-b border-line/60 bg-surface-2/50 px-3 py-2">
        <span className="font-display text-[10px] font-bold tracking-[0.2em] text-accent-2 uppercase">
          {title}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line/60 text-[10px] font-bold tracking-wider text-ink-faint uppercase">
              <th className="px-3 py-2 text-left">Stat</th>
              <th className="max-w-[120px] truncate px-3 py-2 text-right">
                {nameA.split(' ').pop()}
              </th>
              <th className="max-w-[120px] truncate px-3 py-2 text-right">
                {nameB.split(' ').pop()}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-line/40 last:border-0 even:bg-ink/[0.02]"
              >
                <td className="px-3 py-2 text-ink-soft">{row.label}</td>
                <td className={cn('px-3 py-2 text-right text-ink', statNum)}>
                  {row.a}
                </td>
                <td className={cn('px-3 py-2 text-right text-ink', statNum)}>
                  {row.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function battingRows(
  a: PlayerBattingTotals,
  b: PlayerBattingTotals,
): { label: string; a: string; b: string }[] {
  return [
    { label: 'Matches', a: fmtVal(a.matches), b: fmtVal(b.matches) },
    { label: 'Innings', a: fmtVal(a.innings), b: fmtVal(b.innings) },
    { label: 'Runs', a: fmtVal(a.runs), b: fmtVal(b.runs) },
    { label: 'Balls faced', a: fmtVal(a.ballsFaced), b: fmtVal(b.ballsFaced) },
    { label: 'Average', a: fmtVal(a.average, 2), b: fmtVal(b.average, 2) },
    { label: 'Strike rate', a: fmtVal(a.strikeRate, 2), b: fmtVal(b.strikeRate, 2) },
    { label: 'Fours', a: fmtVal(a.fours), b: fmtVal(b.fours) },
    { label: 'Sixes', a: fmtVal(a.sixes), b: fmtVal(b.sixes) },
  ];
}

function bowlingRows(
  a: PlayerBowlingTotals,
  b: PlayerBowlingTotals,
): { label: string; a: string; b: string }[] {
  return [
    { label: 'Innings bowled', a: fmtVal(a.inningsBowled), b: fmtVal(b.inningsBowled) },
    { label: 'Overs', a: fmtVal(a.overs, 1), b: fmtVal(b.overs, 1) },
    { label: 'Wickets', a: fmtVal(a.wickets), b: fmtVal(b.wickets) },
    { label: 'Economy', a: fmtVal(a.economy, 2), b: fmtVal(b.economy, 2) },
    { label: 'Average', a: fmtVal(a.average, 2), b: fmtVal(b.average, 2) },
  ];
}

export function ComparisonCard({ data, className }: ComparisonCardProps) {
  const entityA = data.entityA ?? {};
  const entityB = data.entityB ?? {};
  const nameA = entityName(entityA.profile);
  const nameB = entityName(entityB.profile);

  const enriched = useMemo(() => {
    if (data.enriched) return data.enriched;
    return enrichPlayerComparisonData(data) ?? undefined;
  }, [data]);

  const quickMetrics = buildMetrics(data);
  const isTeam = data.comparisonType === 'team_vs_team';

  return (
    <GlassCard className={cn('p-4 sm:p-5', className)}>
      <CardHeader
        title="Player duel"
        subtitle={
          enriched?.contextLabel ??
          data.comparisonType?.replace(/_/g, ' ') ??
          'Head to head'
        }
      />

      {!isTeam ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <EntityColumn name={nameA} profile={entityA.profile} />
            <EntityColumn name={nameB} profile={entityB.profile} />
          </div>

          {enriched ? (
            <div className="mt-4 space-y-3">
              <CompareTable
                title="Batting"
                nameA={nameA}
                nameB={nameB}
                rows={battingRows(enriched.playerA.batting, enriched.playerB.batting)}
              />
              <CompareTable
                title="Bowling"
                nameA={nameA}
                nameB={nameB}
                rows={bowlingRows(enriched.playerA.bowling, enriched.playerB.bowling)}
              />
            </div>
          ) : null}

          {quickMetrics.length > 0 && !enriched ? (
            <QuickBars metrics={quickMetrics} />
          ) : null}

          {enriched && enriched.insightBullets.length > 0 ? (
            <div className={cn(surfaceInset, 'mt-4 p-4')}>
              <h4 className="font-display text-[11px] font-bold tracking-[0.22em] text-ink uppercase">
                What the numbers say
              </h4>
              <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                {enriched.insightBullets.map((bullet) => (
                  <li key={bullet.slice(0, 48)} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-2" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-ink-soft">Team comparison — see metrics below.</p>
      )}
    </GlassCard>
  );
}

function QuickBars({
  metrics,
}: {
  metrics: { label: string; a: number; b: number; leader?: string }[];
}) {
  return (
    <div className="mt-4 space-y-2">
      {metrics.map((metric) => {
        const max = Math.max(metric.a, metric.b, 1);
        return (
          <div key={metric.label} className={cn(surfaceInset, 'px-3 py-2.5')}>
            <p className="mb-2 text-center text-[10px] font-bold tracking-[0.18em] text-ink-faint uppercase">
              {metric.label}
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
              <span
                className={cn(
                  'text-right',
                  statNum,
                  diffTone(metric.leader, 'a'),
                )}
              >
                {formatNumber(metric.a)}
              </span>
              <span className="font-display text-[10px] font-bold text-ink-mute">
                VS
              </span>
              <span className={cn(statNum, diffTone(metric.leader, 'b'))}>
                {formatNumber(metric.b)}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="flex h-1.5 justify-end overflow-hidden rounded-full bg-ink/[0.06]">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(metric.a / max) * 100}%` }}
                />
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <div
                  className="h-full rounded-full bg-accent-2"
                  style={{ width: `${(metric.b / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EntityColumn({
  name,
  profile,
}: {
  name: string;
  profile?: PlayerProfile;
}) {
  return (
    <div className={cn(surfaceInset, 'flex flex-col items-center p-3.5 text-center')}>
      <PlayerAvatar name={name} profile={profile} size="lg" />
      <p className="mt-2.5 truncate font-display text-sm font-bold tracking-wide text-ink">
        {name}
      </p>
    </div>
  );
}
