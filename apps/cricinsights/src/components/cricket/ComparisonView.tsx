'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
} from 'react';
import type { PlayerComparison } from '@/types/cricket';
import { CricketCardPresentation } from './CricketCardPresentation';
import CricketPlayerCard from './CricketPlayerCard';
import { CricketBallIcon } from './CricketBallIcon';
import StatRadar from './StatRadar';
import VsBurst from './VsBurst';
import { pageAccent, rgba, resolveCardTheme } from './finishTheme';
import CardShareActions from './CardShareActions';

const CARD_WIDTH = 'clamp(150px, min(24vw, 34vh), 292px)';

function StatBar({
  row,
  resolved,
  aAccent,
  bAccent,
}: {
  row: PlayerComparison['rows'][number];
  resolved: boolean;
  aAccent: string;
  bAccent: string;
}) {
  const value = (side: 'a' | 'b', accent: string) => {
    const num = side === 'a' ? row.playerA : row.playerB;
    const won = row.winner === side;
    const lost = row.winner !== null && !won;
    return (
      <span
        className={`inline-flex items-center gap-[6px] ${side === 'a' ? 'flex-row' : 'flex-row-reverse'}`}
      >
        <span
          className={`font-display text-[clamp(17px,2.1vw,22px)] leading-none tabular-nums ${
            resolved ? 'animate-score-tick' : ''
          }`}
          style={{
            color: won ? accent : lost ? 'var(--color-ink-mute)' : 'var(--color-ink-soft)',
            textShadow: won ? `0 0 12px ${rgba(accent, 0.4)}` : undefined,
          }}
        >
          {num}
        </span>
        {won && (
          <span
            aria-hidden
            className="h-[4px] w-[4px] shrink-0 rounded-full"
            style={{
              background: accent,
              boxShadow: `0 0 7px ${rgba(accent, 0.55)}`,
            }}
          />
        )}
      </span>
    );
  };

  const bar = (side: 'a' | 'b', accent: string) => {
    const val = side === 'a' ? row.playerA : row.playerB;
    const won = row.winner === side;
    const lost = row.winner !== null && !won;
    const pct = (val / 99) * 100;
    const barStyle: CSSProperties = resolved
      ? {
          width: `${pct}%`,
          ['--target-width' as string]: `${pct}%`,
          animation: 'delivery-line 0.85s cubic-bezier(.16,1,.3,1) forwards',
          background: lost ? rgba(accent, 0.45) : accent,
          boxShadow: won ? `0 0 10px ${rgba(accent, 0.5)}` : undefined,
        }
      : { width: '0%' };

    return (
      <div
        className={`flex h-[7px] w-full overflow-hidden rounded-full bg-ink/[0.08] ${
          side === 'a' ? 'justify-end' : 'justify-start'
        }`}
      >
        <div className="h-full rounded-full" style={barStyle} />
      </div>
    );
  };

  return (
    <div
      className="grid grid-cols-[minmax(30px,auto)_1fr_44px_1fr_minmax(30px,auto)] items-center gap-[9px] rounded-lg px-[6px] py-[6px] transition-colors hover:bg-ink/[0.03]"
      style={
        resolved
          ? { animation: 'gf-row-resolve .45s cubic-bezier(.16,1,.3,1) both' }
          : { opacity: 0.35 }
      }
    >
      <span className="flex justify-end">
        {resolved ? value('a', aAccent) : <span className="text-ink-mute">··</span>}
      </span>
      {bar('a', aAccent)}
      <span className="font-display text-center text-[10.5px] tracking-[.24em] text-ink-mute">
        {row.label}
      </span>
      {bar('b', bAccent)}
      <span className="flex justify-start">
        {resolved ? value('b', bAccent) : <span className="text-ink-mute">··</span>}
      </span>
    </div>
  );
}

function DuelScoreboard({
  scoreA,
  scoreB,
  aAccent,
  bAccent,
  settled,
  compact,
}: {
  scoreA: number;
  scoreB: number;
  aAccent: string;
  bAccent: string;
  settled: boolean;
  compact?: boolean;
}) {
  const winner =
    settled && scoreA !== scoreB ? (scoreA > scoreB ? 'a' : 'b') : null;
  const scoreSize = compact
    ? 'text-[clamp(2rem,7vw,2.75rem)]'
    : 'text-[clamp(48px,8vw,88px)]';

  const scoreClass = (side: 'a' | 'b') =>
    [
      'inline-block font-display font-black tabular-nums animate-score-tick',
      winner === side ? 'animate-stumps-flash rounded-lg px-2' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="flex flex-col items-center">
      <div className="font-display flex items-center gap-2 text-[11px] font-bold tracking-[.26em] text-ink-faint">
        {!settled && (
          <span className="relative flex h-[6px] w-[6px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-accent" />
          </span>
        )}
        {settled ? 'RESULT' : 'LIVE'}
      </div>
      <div
        className={`font-display mt-1 flex items-center gap-3 ${scoreSize} font-black`}
      >
        <span className={scoreClass('a')} style={{ color: aAccent }}>
          {scoreA}
        </span>
        <CricketBallIcon size={compact ? 22 : 32} className="shrink-0 opacity-90" />
        <span className={scoreClass('b')} style={{ color: bAccent }}>
          {scoreB}
        </span>
      </div>
    </div>
  );
}

export default function ComparisonView({
  comparison,
  variant = 'arena',
}: {
  comparison?: PlayerComparison;
  variant?: 'arena' | 'embedded';
}) {
  const playerA = comparison?.playerA;
  const playerB = comparison?.playerB;
  const rows = comparison?.rows ?? [];
  const insight = comparison?.insight ?? '';
  const embedded = variant === 'embedded';
  const cardWidth = embedded ? 'clamp(108px, 30vw, 148px)' : CARD_WIDTH;
  const [shown, setShown] = useState(embedded ? rows.length : 0);
  const cardARef = useRef<HTMLDivElement>(null);
  const cardBRef = useRef<HTMLDivElement>(null);
  const vsRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ ax: 0, ay: 0, bx: 0, by: 0 });

  useEffect(() => {
    if (embedded || shown >= rows.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 420);
    return () => clearTimeout(t);
  }, [embedded, shown, rows.length]);

  const skip = useCallback(() => setShown(rows.length), [rows.length]);

  const handleParallax = (e: MouseEvent<HTMLDivElement>) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({
      ax: nx * -22,
      ay: ny * -14,
      bx: nx * 22,
      by: ny * 14,
    });
  };

  if (!playerA || !playerB) {
    return (
      <p className="text-sm text-ink-soft">Comparison data is unavailable.</p>
    );
  }

  const aTheme = resolveCardTheme(playerA.tier);
  const bTheme = resolveCardTheme(playerB.tier);
  const aAccent = pageAccent(playerA.tier);
  const bAccent = pageAccent(playerB.tier);

  const scoreA = rows.slice(0, shown).filter((r) => r.winner === 'a').length;
  const scoreB = rows.slice(0, shown).filter((r) => r.winner === 'b').length;
  const settled = shown >= rows.length;

  const corner = (
    card: typeof playerA,
    side: 'a' | 'b',
    ref: RefObject<HTMLDivElement | null>,
  ) => (
    <div
      className={`flex flex-col items-center gap-[10px] ${
        side === 'a' ? 'max-[900px]:order-1' : 'max-[900px]:order-2'
      }`}
    >
      <div
        ref={ref}
        style={{
          width: cardWidth,
          animation: embedded
            ? undefined
            : `${side === 'a' ? 'walkout-left' : 'walkout-right'} 1.05s cubic-bezier(.16,1,.3,1) both`,
        }}
      >
        {embedded ? (
          <CricketPlayerCard card={card} />
        ) : (
          <CricketCardPresentation
            card={card}
            entrance={side === 'a' ? 'walkout' : 'bat-swing'}
          />
        )}
      </div>
      {!embedded && (
        <div
          className="flex flex-col items-center gap-[7px]"
          style={{
            width: cardWidth,
            animation: 'gf-radar-in .7s cubic-bezier(.16,1,.3,1) .5s both',
          }}
        >
          <div className="w-[78%]">
            <StatRadar
              stats={card.stats}
              tier={card.tier}
              rival={{
                stats: side === 'a' ? playerB.stats : playerA.stats,
                tier: side === 'a' ? playerB.tier : playerA.tier,
              }}
            />
          </div>
          <div className="text-center text-[11.5px] leading-snug text-ink-soft">
            <span className="font-semibold text-ink">{card.archetype}</span>
            <span className="mx-[6px] text-ink-mute">·</span>
            <span>{card.player.team}</span>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="relative mt-2 overflow-hidden rounded-xl border border-line/70 bg-surface-2/50 p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(70% 80% at 15% 40%, ${rgba(aAccent, 0.14)}, transparent 65%), radial-gradient(70% 80% at 85% 40%, ${rgba(bAccent, 0.14)}, transparent 65%)`,
          }}
        />

        <header className="relative mb-4 text-center">
          <div className="font-display text-[10px] font-bold tracking-[.28em] text-accent">
            PLAYER DUEL
          </div>
          <h3 className="font-display mt-1.5 flex items-center justify-center gap-2 text-[clamp(1rem,3.5vw,1.35rem)] font-black">
            <span style={{ color: aAccent }}>
              {playerA.player.fullname.split(' ').pop()}
            </span>
            <VsBurst size={36} />
            <span style={{ color: bAccent }}>
              {playerB.player.fullname.split(' ').pop()}
            </span>
          </h3>
        </header>

        <div className="relative flex items-start justify-center gap-2 sm:gap-4">
          {corner(playerA, 'a', cardARef)}
          <div className="flex shrink-0 flex-col items-center px-1 pt-6">
            <DuelScoreboard
              scoreA={scoreA}
              scoreB={scoreB}
              aAccent={aAccent}
              bAccent={bAccent}
              settled
              compact
            />
          </div>
          {corner(playerB, 'b', cardBRef)}
        </div>

        <div className="relative mx-auto mt-4 w-full max-w-md">
          {rows.map((row) => (
            <StatBar
              key={row.key}
              row={row}
              resolved
              aAccent={aAccent}
              bAccent={bAccent}
            />
          ))}
        </div>

        <p className="relative mt-3 text-center text-[12.5px] leading-relaxed text-ink-soft">
          {insight}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={arenaRef}
      className="relative"
      onMouseMove={handleParallax}
      onClick={(e) => {
        if (!settled && !(e.target as HTMLElement).closest('button,a')) skip();
      }}
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-y-0 left-0 w-[62%] transition-opacity duration-700"
          style={{
            background: `radial-gradient(85% 70% at 18% 30%, ${aTheme.glow}, transparent 70%)`,
            opacity: 0.14 + scoreA * 0.06,
            transform: `translate(${parallax.ax}px, ${parallax.ay}px)`,
            transition: 'transform 0.35s ease-out, opacity 0.7s ease',
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[62%] transition-opacity duration-700"
          style={{
            background: `radial-gradient(85% 70% at 82% 30%, ${bTheme.glow}, transparent 70%)`,
            opacity: 0.14 + scoreB * 0.06,
            transform: `translate(${parallax.bx}px, ${parallax.by}px)`,
            transition: 'transform 0.35s ease-out, opacity 0.7s ease',
          }}
        />
      </div>

      <header className="mb-6 text-center">
        <div className="font-display text-[12px] font-bold tracking-[.3em] text-accent">
          PLAYER DUEL
        </div>
        <h2 className="font-display mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4 font-black">
          <span className="text-right" style={{ color: aAccent }}>
            {playerA.player.fullname}
          </span>
          <VsBurst size={72} />
          <span className="text-left" style={{ color: bAccent }}>
            {playerB.player.fullname}
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-soft">{insight}</p>
      </header>

      <div
        ref={vsRef}
        className="grid grid-cols-[1fr_minmax(270px,350px)_1fr] items-start gap-[clamp(14px,2.6vw,44px)] max-[900px]:flex max-[900px]:flex-wrap max-[900px]:justify-center"
      >
        {corner(playerA, 'a', cardARef)}
        <div className="flex flex-col items-center max-[900px]:order-3 max-[900px]:w-full max-[900px]:max-w-[420px]">
          <DuelScoreboard
            scoreA={scoreA}
            scoreB={scoreB}
            aAccent={aAccent}
            bAccent={bAccent}
            settled={settled}
          />
          <div className="mt-4 flex w-full flex-col gap-1">
            {rows.map((row, i) => (
              <StatBar
                key={row.key}
                row={row}
                resolved={i < shown}
                aAccent={aAccent}
                bAccent={bAccent}
              />
            ))}
          </div>
          {!settled && (
            <button
              type="button"
              onClick={skip}
              className="mt-6 text-[11px] text-ink-mute hover:text-ink-soft"
            >
              tap to skip
            </button>
          )}
        </div>
        {corner(playerB, 'b', cardBRef)}
      </div>

      {settled && (
        <div className="mt-8 flex justify-center">
          <CardShareActions
            title={`${playerA.player.fullname} vs ${playerB.player.fullname}`}
            cardRefs={[cardARef, cardBRef]}
            vsRef={vsRef}
          />
        </div>
      )}
    </div>
  );
}
