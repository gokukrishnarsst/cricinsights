'use client';

import type { PlayerCardData } from './types';
import {
  CardHeader,
  GlassCard,
  PlayerAvatar,
  StatPill,
} from './primitives';
import { cn, entityName, formatNumber, humanizeStyle } from './utils';

interface PlayerCardProps {
  data: PlayerCardData;
  className?: string;
}

export function PlayerCard({ data, className }: PlayerCardProps) {
  const profile = data.profile ?? {};
  const name = entityName(profile);

  const highlights = data.highlights ?? {};
  const role =
    profile.position ??
    (profile.battingstyle ? humanizeStyle(profile.battingstyle) : null);

  return (
    <GlassCard className={cn('p-4 sm:p-5', className)}>
      <CardHeader title="Player Profile" subtitle={profile.country ?? undefined} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative mx-auto sm:mx-0">
          <PlayerAvatar name={name} profile={profile} size="lg" />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="truncate font-display text-xl font-bold tracking-wide text-ink">
            {name}
          </h2>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {role ? (
              <span className="rounded-full border border-accent-2/25 bg-accent-2/10 px-2.5 py-0.5 text-xs font-medium text-accent-2">
                {role}
              </span>
            ) : null}
            {profile.battingstyle ? (
              <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink-soft">
                {humanizeStyle(profile.battingstyle)}
              </span>
            ) : null}
            {profile.bowlingstyle ? (
              <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink-soft">
                {humanizeStyle(profile.bowlingstyle)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatPill
          label="Runs"
          value={formatNumber(highlights.totalBattingRuns ?? 0)}
          accent="cyan"
        />
        <StatPill
          label="Wickets"
          value={formatNumber(highlights.totalBowlingWickets ?? 0)}
          accent="amber"
        />
        <StatPill
          label="Seasons"
          value={formatNumber(highlights.seasonsTracked ?? 0)}
          accent="emerald"
        />
      </div>
    </GlassCard>
  );
}
