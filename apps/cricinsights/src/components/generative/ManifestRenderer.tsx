'use client';

import type { ChatManifest, UIComponent as ManifestComponent } from '@/lib/template-engine';
import type { ComponentRendererProps } from '@/components/generative-ui/types';
import { ComparisonCard } from '@/components/generative-ui/ComparisonCard';
import { LeaderboardTable } from '@/components/generative-ui/LeaderboardTable';
import { MatchPreviewCard } from '@/components/generative-ui/MatchPreviewCard';
import { MatchupCard } from '@/components/generative-ui/MatchupCard';
import { NarrativeBlock } from '@/components/generative-ui/NarrativeBlock';
import { PlayerCard } from '@/components/generative-ui/PlayerCard';
import { ScorecardView } from '@/components/generative-ui/ScorecardView';
import { ShareButton } from '@/components/generative-ui/ShareButton';
import { StatsTable } from '@/components/generative-ui/StatsTable';
import { TrendChart } from '@/components/generative-ui/TrendChart';
import TiltCard from '@/components/cricket/TiltCard';
import { cn, glassCard, normalizeComponentType } from '@/components/generative-ui/utils';
import { RenderGenerativeItem } from './GenerativeRenderer';
import GenerativeSkeleton from './GenerativeSkeleton';
import {
  adaptManifestComponent,
  manifestItemToUI,
} from './manifest-adapter';

export type UIManifest = ChatManifest;

export function ComponentRenderer({
  manifest,
  loading = false,
  className,
  onShare,
  showNarrative = false,
}: ComponentRendererProps) {
  if (loading) {
    return <GenerativeSkeleton variant="wide" className={className} />;
  }

  if (!manifest) return null;

  const { components, narrative, shareable } = manifest;

  return (
    <div className={cn('w-full space-y-3', className)}>
      {showNarrative && narrative ? (
        <div className="animate-rise-soft">
          <NarrativeBlock text={narrative} />
        </div>
      ) : null}

      {components.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {components.map((component, index) => (
            <ManifestComponentSlot
              key={`${component.type}-${index}`}
              component={component}
              index={index}
            />
          ))}
        </div>
      ) : null}

      {shareable !== false && narrative ? (
        <div className="flex justify-end pt-1">
          <ShareButton manifest={manifest} onShare={onShare} />
        </div>
      ) : null}
    </div>
  );
}

function ManifestComponentSlot({
  component,
  index,
}: {
  component: ManifestComponent;
  index: number;
}) {
  const adapted = manifestItemToUI(component);

  if (adapted) {
    return (
      <div className="min-w-0" style={{ animationDelay: `${index * 60}ms` }}>
        <RenderGenerativeItem item={adapted} comparisonVariant="embedded" />
      </div>
    );
  }

  return (
    <div
      className="min-w-0 animate-rise-soft"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <LegacyManifestComponent component={component} />
    </div>
  );
}

function LegacyManifestComponent({
  component,
}: {
  component: ManifestComponent;
}) {
  const type = normalizeComponentType(component.type);
  const data = component.data ?? {};

  switch (type) {
    case 'player_card':
      return (
        <div className="animate-bat-swing mx-auto max-w-[300px]">
          <TiltCard>
            <PlayerCard data={data} />
          </TiltCard>
        </div>
      );
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
    case 'insight_card':
      return (
        <RenderGenerativeItem
          item={{
            type: 'insight_card',
            title: String(data.title ?? 'Notice'),
            content: String(data.content ?? data.text ?? ''),
            severity:
              data.severity === 'info' ||
              data.severity === 'warning' ||
              data.severity === 'success' ||
              data.severity === 'error'
                ? data.severity
                : 'info',
          }}
        />
      );
    case 'error_card':
      return (
        <RenderGenerativeItem
          item={{
            type: 'insight_card',
            title: String(data.title ?? 'Error'),
            content: String(
              data.reason ??
                data.suggestion ??
                data.content ??
                'Something went wrong.',
            ),
            severity: 'error',
          }}
        />
      );
    default: {
      const fallbackUi = adaptManifestComponent(component);
      if (fallbackUi) {
        return <RenderGenerativeItem item={fallbackUi} />;
      }
      return (
        <div className={cn(glassCard, 'border-gold/30 p-4')}>
          <p className="text-xs font-bold tracking-wider text-gold uppercase">
            Unsupported component
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            No renderer for{' '}
            <code className="text-accent-2">{component.type}</code>
          </p>
        </div>
      );
    }
  }
}

export {
  default as GenerativeRenderer,
  isWideGenerativeComponent,
} from './GenerativeRenderer';
export { isWideManifest, isWideManifestType } from './manifest-adapter';
