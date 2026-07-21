'use client';

import { cn } from '@/lib/utils';
import type { RatedPlayerCard } from '@/types/cricket';
import CricketPlayerCard from './CricketPlayerCard';
import TiltCard from './TiltCard';
import { CRICKET_CARD_MASK, resolveTierVisual } from './card-tiers';

export type CricketCardEntrance = 'walkout' | 'bat-swing' | 'none';

export function CricketCardPresentation({
  card,
  entrance = 'bat-swing',
  className,
}: {
  card: RatedPlayerCard;
  entrance?: CricketCardEntrance;
  className?: string;
}) {
  const visual = resolveTierVisual(card.tier);
  const entranceClass =
    entrance === 'walkout'
      ? 'animate-walkout'
      : entrance === 'bat-swing'
        ? 'animate-bat-swing'
        : '';

  return (
    <div
      className={cn(
        'relative rounded-[1.5rem]',
        visual.premium && 'animate-glow',
        entranceClass,
        className,
      )}
      style={
        visual.premium
          ? {
              filter: `drop-shadow(0 0 24px ${visual.glow})`,
            }
          : undefined
      }
    >
      <div className="holo-shimmer relative overflow-hidden rounded-[1.5rem]">
        <TiltCard maskSrc={CRICKET_CARD_MASK}>
          <CricketPlayerCard card={card} />
        </TiltCard>
      </div>
    </div>
  );
}
