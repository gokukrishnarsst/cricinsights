'use client';

import type { ComponentType, ComponentRendererProps, UIComponent } from './types';
import { ComparisonCard } from './ComparisonCard';
import { LeaderboardTable } from './LeaderboardTable';
import { MatchPreviewCard } from './MatchPreviewCard';
import { MatchupCard } from './MatchupCard';
import { NarrativeBlock } from './NarrativeBlock';
import { PlayerCard } from './PlayerCard';
import { ScorecardView } from './ScorecardView';
import { ShareButton } from './ShareButton';
import { ManifestSkeleton } from './Skeleton';
import { StatsTable } from './StatsTable';
import { TrendChart } from './TrendChart';
import { cn, entrance, glassCard, normalizeComponentType } from './utils';

export function ComponentRenderer({
  manifest,
  loading = false,
  className,
  onShare,
}: ComponentRendererProps) {
  if (loading) {
    return <ManifestSkeleton className={className} />;
  }

  if (!manifest) {
    return null;
  }

  const { components, narrative, shareable } = manifest;

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-5xl space-y-4 px-3 py-2 sm:space-y-5 sm:px-0',
        className,
      )}
    >
      {components.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {components.map((component, index) => (
            <div
              key={`${component.type}-${index}`}
              className={cn(
                spanClass(component.type),
                entrance,
              )}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <ComponentSwitch component={component} />
            </div>
          ))}
        </div>
      ) : null}

      {narrative ? (
        <div className={cn('lg:col-span-2', entrance)} style={{ animationDelay: '120ms' }}>
          <NarrativeBlock text={narrative} />
        </div>
      ) : null}

      {shareable !== false && narrative ? (
        <div className="flex justify-end">
          <ShareButton manifest={manifest} onShare={onShare} />
        </div>
      ) : null}
    </div>
  );
}

function spanClass(type: string): string {
  const normalized = normalizeComponentType(type) as ComponentType;
  switch (normalized) {
    case 'stats_table':
    case 'leaderboard_table':
    case 'scorecard_view':
    case 'trend_chart':
      return 'lg:col-span-2';
    default:
      return '';
  }
}

function ComponentSwitch({ component }: { component: UIComponent }) {
  const type = normalizeComponentType(component.type) as ComponentType;
  const data = component.data;

  switch (type) {
    case 'player_card':
      return <PlayerCard data={data} />;
    case 'comparison_card':
      return <ComparisonCard data={data} />;
    case 'stats_table':
    case 'h2h_stats_table':
      return <StatsTable data={data} />;
    case 'trend_chart':
      return <TrendChart data={data} />;
    case 'scorecard_view':
      return <ScorecardView data={data} />;
    case 'leaderboard_table':
      return <LeaderboardTable data={data} />;
    case 'match_preview_card':
      return <MatchPreviewCard data={data} />;
    case 'matchup_card':
      return <MatchupCard data={data} />;
    case 'social_share_card':
      return <ShareButton data={data} />;
    case 'narrative_block':
      return <NarrativeBlock data={data} />;
    default:
      return <UnknownComponent type={component.type} data={data} />;
  }
}

function UnknownComponent({
  type,
  data,
}: {
  type: string;
  data: Record<string, unknown>;
}) {
  return (
    <div
      className={cn(glassCard, 'border-gold/30 p-4 sm:p-5')}
    >
      <p className="text-xs font-bold tracking-wider text-gold uppercase">
        Unsupported component
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        No renderer for <code className="text-accent-2">{type}</code>
      </p>
      {Object.keys(data).length > 0 ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-line bg-surface-2/60 p-3 text-[11px] text-ink-mute">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
