"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import type { RatedPlayerCard } from "@/types/cricket";
import CricketPlayerCard from "./CricketPlayerCard";
import CardShareActions from "./CardShareActions";
import { AttributesPanel, MetricsPanel, ReportHeader } from "./ScoutReport";
import { confettiPalette, resolveResultTheme } from "./finishTheme";
import { useReveal } from "@/hooks/useReveal";
import { burstConfetti } from "@/lib/confetti";

const CARD_WIDTH = "clamp(220px, min(80vw, 40vh), 332px)";

export default function ScoutView({
  card,
  onBack,
}: {
  card: RatedPlayerCard;
  onBack: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const theme = resolveResultTheme(card.tier);
  const phase = useReveal(card.tier);

  useEffect(() => {
    if (phase === "burst") burstConfetti(confettiPalette(card.tier));
  }, [phase, card.tier]);

  const ignited = phase === "ignite" || phase === "burst" || phase === "freeze";
  const unlit = phase === "rise";

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl"
        style={{
          background: `radial-gradient(120% 80% at 50% -10%, ${theme.glow}, transparent 55%)`,
          opacity: ignited ? 0.35 : 0.12,
          transition: "opacity 1s ease",
        }}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          SCOUT ANOTHER
        </button>
        <Link
          href={`/compare/players`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-[12px] font-semibold text-ink-soft shadow-sm transition hover:border-accent-2/40 hover:text-ink"
        >
          <Swords size={14} />
          Duel a rival
        </Link>
      </div>

      <div className="shrink-0">
        <ReportHeader card={card} />
      </div>

      <div className="mt-[clamp(14px,2.4vh,26px)] grid grid-cols-[1fr_auto_1fr] items-start gap-[clamp(16px,2.4vw,40px)] max-[980px]:mt-6 max-[980px]:flex max-[980px]:flex-col max-[980px]:items-center">
        <div className="flex justify-end max-[980px]:order-2 max-[980px]:w-full max-[980px]:max-w-[420px] max-[980px]:justify-center">
          <div className="w-full max-w-[360px]">
            <AttributesPanel card={card} />
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-[clamp(12px,2vh,18px)] max-[980px]:order-1">
          <div
            className="animate-spotlight pointer-events-none absolute left-1/2 top-[-10%] z-0 h-[70%] w-[120%] -translate-x-1/2 blur-[40px]"
            style={{
              background: `radial-gradient(60% 70% at 50% 0%, ${theme.glow}, transparent 72%)`,
              opacity: ignited ? 0.5 : 0,
              transition: "opacity .5s ease",
            }}
          />

          <div className="animate-walkout relative" style={{ width: CARD_WIDTH }}>
            <div ref={captureRef} className="relative">
              <div
                className="animate-glow pointer-events-none absolute -inset-[12%] z-0 rounded-full blur-[20px]"
                style={{
                  background: `radial-gradient(closest-side, ${theme.glow}, transparent 72%)`,
                  opacity: ignited ? 0.85 : 0,
                  transition: "opacity .6s ease",
                }}
              />
              <div
                className="relative z-[1] transition-[filter] duration-700"
                style={{
                  filter: unlit ? "brightness(0.72) saturate(0.8)" : "brightness(1) saturate(1)",
                }}
              >
                <CricketPlayerCard card={card} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5" style={{ width: CARD_WIDTH }}>
            <CardShareActions
              title={card.player.fullname}
              cardRefs={[captureRef]}
            />
          </div>
        </div>

        <div className="flex max-[980px]:order-3 max-[980px]:w-full max-[980px]:max-w-[420px] max-[980px]:justify-center">
          <div className="w-full max-w-[360px]">
            <MetricsPanel card={card} />
          </div>
        </div>
      </div>
    </div>
  );
}
