'use client';

import { cn, glassCard } from './utils';

interface SkeletonProps {
  className?: string;
  variant?: ComponentSkeletonVariant;
  count?: number;
}

export type ComponentSkeletonVariant =
  | 'player_card'
  | 'comparison_card'
  | 'stats_table'
  | 'trend_chart'
  | 'scorecard_view'
  | 'leaderboard_table'
  | 'match_preview_card'
  | 'matchup_card'
  | 'narrative'
  | 'generic';

export function Skeleton({
  className,
  variant = 'generic',
  count = 1,
}: SkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} variant={variant} />
      ))}
    </div>
  );
}

function SkeletonBlock({ variant }: { variant: ComponentSkeletonVariant }) {
  switch (variant) {
    case 'player_card':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="flex gap-4">
            <div className="skeleton-shimmer h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-5 w-40 rounded" />
              <div className="skeleton-shimmer h-3 w-24 rounded" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="skeleton-shimmer h-14 rounded-xl" />
            <div className="skeleton-shimmer h-14 rounded-xl" />
            <div className="skeleton-shimmer h-14 rounded-xl" />
          </div>
        </div>
      );
    case 'comparison_card':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="skeleton-shimmer mb-4 h-4 w-32 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton-shimmer h-36 rounded-xl" />
            <div className="skeleton-shimmer h-36 rounded-xl" />
          </div>
        </div>
      );
    case 'stats_table':
    case 'leaderboard_table':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="skeleton-shimmer mb-4 h-4 w-40 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-8 rounded" />
            ))}
          </div>
        </div>
      );
    case 'trend_chart':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="skeleton-shimmer mb-4 h-4 w-28 rounded" />
          <div className="skeleton-shimmer h-64 rounded-xl" />
        </div>
      );
    case 'scorecard_view':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="skeleton-shimmer mb-4 h-5 w-56 rounded" />
          <div className="skeleton-shimmer mb-3 h-24 rounded-xl" />
          <div className="skeleton-shimmer h-24 rounded-xl" />
        </div>
      );
    case 'match_preview_card':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="grid grid-cols-3 items-center gap-3">
            <div className="skeleton-shimmer h-16 rounded-xl" />
            <div className="skeleton-shimmer mx-auto h-8 w-12 rounded" />
            <div className="skeleton-shimmer h-16 rounded-xl" />
          </div>
        </div>
      );
    case 'matchup_card':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton-shimmer h-28 rounded-xl" />
            <div className="skeleton-shimmer h-28 rounded-xl" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="skeleton-shimmer h-12 rounded-xl" />
            <div className="skeleton-shimmer h-12 rounded-xl" />
            <div className="skeleton-shimmer h-12 rounded-xl" />
          </div>
        </div>
      );
    case 'narrative':
      return (
        <div className={cn(glassCard, 'p-5')}>
          <div className="skeleton-shimmer mb-3 h-3 w-24 rounded" />
          <div className="space-y-2">
            <div className="skeleton-shimmer h-3 w-full rounded" />
            <div className="skeleton-shimmer h-3 w-11/12 rounded" />
            <div className="skeleton-shimmer h-3 w-4/5 rounded" />
          </div>
        </div>
      );
    default:
      return <div className={cn(glassCard, 'skeleton-shimmer h-40 p-5')} />;
  }
}

/** Full-page loading skeleton matching a typical chat response layout */
export function ManifestSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton variant="player_card" />
      <Skeleton variant="stats_table" />
      <Skeleton variant="narrative" />
    </div>
  );
}
