'use client';

import type { RatedPlayerCard } from '@/types/cricket';
import { CricketCardPresentation } from '@/components/cricket/CricketCardPresentation';

export function HeroDuelStack({
  heroA,
  heroB,
}: {
  heroA: RatedPlayerCard;
  heroB: RatedPlayerCard;
}) {
  return (
    <div className="relative mx-auto hidden h-[420px] w-full max-w-[420px] select-none lg:block">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(212,175,55,.12) 0%, rgba(59,130,246,.06) 45%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <div className="card-3d-hover animate-float absolute left-0 top-8 w-[210px] -rotate-[7deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.03]">
        <CricketCardPresentation card={heroA} entrance="bat-swing" />
      </div>
      <div
        className="card-3d-hover animate-float absolute right-0 top-20 w-[210px] rotate-[7deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.03]"
        style={{ animationDelay: '1.2s' }}
      >
        <CricketCardPresentation
          card={heroB}
          entrance="bat-swing"
          className="[animation-delay:0.15s]"
        />
      </div>
    </div>
  );
}
