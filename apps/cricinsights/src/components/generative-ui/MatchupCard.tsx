'use client';

import type { MatchupCardData, PlayerProfile } from './types';
import { CardHeader, GlassCard, PlayerAvatar, StatPill } from './primitives';
import { cn, entityName, formatDecimal, formatNumber, statNum, surfaceInset } from './utils';

interface MatchupCardProps {
  data: MatchupCardData;
  className?: string;
}

export function MatchupCard({ data, className }: MatchupCardProps) {
  const batsmanProfile =
    data.batsman?.profile ?? data.entityA?.profile;
  const bowlerProfile =
    data.bowler?.profile ?? data.entityB?.profile;
  const batsman = entityName(batsmanProfile);
  const bowler = entityName(bowlerProfile);
  const stats = data.matchup ?? data.matchupStats ?? {};

  return (
    <GlassCard className={cn('p-4 sm:p-5', className)}>
      <CardHeader
        title="Batsman vs Bowler"
        subtitle={data.comparisonType?.replace(/_/g, ' ') ?? 'Head-to-head'}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MatchupEntity label="Batsman" name={batsman} profile={batsmanProfile} />
        <MatchupEntity label="Bowler" name={bowler} profile={bowlerProfile} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatPill label="Balls" value={formatNumber(stats.ballsFaced)} />
        <StatPill label="Runs" value={formatNumber(stats.runsScored)} accent="cyan" />
        <StatPill label="Dismissals" value={formatNumber(stats.dismissals)} accent="amber" />
        <StatPill label="4s" value={formatNumber(stats.fours)} />
        <StatPill label="6s" value={formatNumber(stats.sixes)} />
        <StatPill
          label="Strike Rate"
          value={formatDecimal(stats.strikeRate)}
          accent="emerald"
        />
      </div>

      {data.diff?.strikeRate ? (
        <p className="mt-3 text-xs text-ink-mute">
          Strike rate leader:{' '}
          <span className={cn('font-semibold', statNum, 'text-accent-2')}>
            {String(data.diff.strikeRate.leader ?? '—')}
          </span>
        </p>
      ) : null}
    </GlassCard>
  );
}

function MatchupEntity({
  label,
  name,
  profile,
}: {
  label: string;
  name: string;
  profile?: PlayerProfile;
}) {
  return (
    <div className={cn(surfaceInset, 'flex flex-col items-center p-3.5')}>
      <span className="text-[10px] font-bold tracking-wider text-ink-faint uppercase">
        {label}
      </span>
      <div className="mt-2">
        <PlayerAvatar name={name} profile={profile} size="lg" />
      </div>
      <p className="mt-2 text-center font-display text-sm font-bold tracking-wide text-ink">
        {name}
      </p>
    </div>
  );
}
