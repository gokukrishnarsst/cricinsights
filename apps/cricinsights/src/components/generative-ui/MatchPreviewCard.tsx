'use client';

import type { MatchPreviewCardData } from './types';
import { CardHeader, GlassCard } from './primitives';
import { cn, formatNumber, statNum } from './utils';

interface MatchPreviewCardProps {
  data: MatchPreviewCardData;
  className?: string;
}

export function MatchPreviewCard({ data, className }: MatchPreviewCardProps) {
  const fixture = data.fixture;
  const local = fixture?.localteamName ?? data.localTeam?.name ?? 'TBC';
  const visitor = fixture?.visitorteamName ?? data.visitorTeam?.name ?? 'TBC';
  const when = fixture?.startingAt
    ? new Date(fixture.startingAt).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date TBC';

  return (
    <GlassCard className={cn('p-4 sm:p-5', className)}>
      <CardHeader
        title="Match Preview"
        subtitle={data.venue ?? fixture?.matchFormat ?? undefined}
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <TeamBlock name={local} form={data.localForm} align="left" />
        <div className="text-center">
          <p className="text-xs tracking-widest text-ink-faint uppercase">vs</p>
          <p className="mt-1 text-sm font-medium text-accent-2">{when}</p>
        </div>
        <TeamBlock name={visitor} form={data.visitorForm} align="right" />
      </div>

      {data.headToHead || data.h2hSummary ? (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-ink-soft">
          {data.h2hSummary ??
            `H2H: ${formatNumber(data.headToHead?.teamAWins)} - ${formatNumber(data.headToHead?.teamBWins)} (${formatNumber(data.headToHead?.matches)} matches)`}
        </div>
      ) : null}
    </GlassCard>
  );
}

function TeamBlock({
  name,
  form,
  align,
}: {
  name: string;
  form?: MatchPreviewCardData['localForm'];
  align: 'left' | 'right';
}) {
  return (
    <div className={cn('text-center sm:text-left', align === 'right' && 'sm:text-right')}>
      <p className="font-display text-lg font-bold tracking-wide text-ink">{name}</p>
      {form?.length ? (
        <div
          className={cn(
            'mt-2 flex flex-wrap gap-1',
            align === 'right' ? 'justify-center sm:justify-end' : 'justify-center sm:justify-start',
          )}
        >
          {form.slice(0, 5).map((f, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                statNum,
                resultClass(f.result),
              )}
              title={f.opponentName ?? undefined}
            >
              {resultLetter(f.result)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function resultClass(result?: string) {
  const r = result?.toLowerCase();
  if (r === 'win') return 'bg-emerald/15 text-emerald';
  if (r === 'loss') return 'bg-rose/15 text-rose';
  return 'bg-surface-2 text-ink-mute';
}

function resultLetter(result?: string) {
  const r = result?.toLowerCase();
  if (r === 'win') return 'W';
  if (r === 'loss') return 'L';
  if (r === 'draw') return 'D';
  return '—';
}
