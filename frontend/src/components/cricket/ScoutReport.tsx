"use client";

import { useEffect, useState } from "react";
import {
  Crown,
  Flame,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import type { RatedPlayerCard } from "@/types/cricket";
import { buildScoutReport, TIER_LABELS, type ScoutMetric, type ScoutPlaystyle } from "@/lib/scout/report";
import { formatCount } from "@/lib/utils";
import { resolveResultTheme, rgba } from "./finishTheme";

const PLAYSTYLE_ICONS: Record<string, typeof Star> = {
  Powerplay: Zap,
  Death: Target,
  Economy: TrendingUp,
  Wicket: Trophy,
  Clutch: Crown,
  Marathoner: Timer,
  Six: Flame,
  Rapid: Zap,
  Complete: Star,
};

function StarRating({ value, accent }: { value: number; accent: string }) {
  return (
    <span className="inline-flex gap-[3px]" style={{ color: accent }} aria-label={`${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={15}
          className={i < value ? "fill-current" : "fill-transparent opacity-25"}
        />
      ))}
    </span>
  );
}

function AttributeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-[11px] last:border-0">
      <span className="text-[13.5px] text-ink-soft">{label}</span>
      <span className="font-display text-[14px] font-bold tracking-[.02em] text-ink">{children}</span>
    </div>
  );
}

function Section({
  title,
  accent,
  className,
  children,
}: {
  title: string;
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-card p-4 shadow-sm ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-[2px] w-4 rounded-full" style={{ background: accent }} />
        <h3 className="font-display text-[11px] font-bold tracking-[.22em] text-ink-faint">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function PlaystyleList({
  playstyles,
  accent,
}: {
  playstyles: ScoutPlaystyle[];
  accent: string;
}) {
  if (playstyles.length === 0) {
    return (
      <p className="py-1 text-[13.5px] leading-snug text-ink-mute">
        No standout traits yet — keep building the sample.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-[11px] pt-1">
      {playstyles.map((p) => {
        const key = Object.keys(PLAYSTYLE_ICONS).find((k) => p.name.includes(k)) ?? "Star";
        const Icon = PLAYSTYLE_ICONS[key] ?? Star;
        return (
          <li key={p.name} className="flex items-start gap-2.5" title={p.reason}>
            <Icon size={16} style={{ color: accent }} className="mt-0.5 shrink-0" aria-hidden />
            <span className="text-[14px] font-medium text-ink-dim">
              {p.name}
              {p.plus && (
                <span
                  className="font-display ml-1.5 rounded-[5px] px-1.5 text-[11px] font-extrabold leading-[15px] text-white"
                  style={{ background: accent }}
                >
                  +
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MetricBar({
  metric,
  accent,
  index = 0,
}: {
  metric: ScoutMetric;
  accent: string;
  index?: number;
}) {
  const fill = Math.max(metric.score, 4);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const t = setTimeout(() => setMounted(true), reduced ? 0 : 120 + index * 55);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        transition: "opacity .5s ease, transform .5s cubic-bezier(.16,1,.3,1)",
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink-soft">{metric.label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[11px] tabular-nums text-ink-mute">
            {formatCount(metric.value)}
            {metric.unit ? ` ${metric.unit}` : ""}
          </span>
          <span
            className="font-display text-[16px] font-bold leading-none tabular-nums"
            style={{ color: accent }}
          >
            {metric.score}
          </span>
        </span>
      </div>
      <div className="mt-[7px] h-[3px] overflow-hidden rounded-full bg-ink/[0.08]">
        <div
          className="h-full rounded-full transition-[width] duration-[900ms] ease-out"
          style={{
            width: mounted ? `${fill}%` : "0%",
            background: `linear-gradient(90deg, ${rgba(accent, 0.55)}, ${accent})`,
          }}
        />
      </div>
    </div>
  );
}

function Stagger({
  step,
  children,
  className,
}: {
  step: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const t = setTimeout(() => setShown(true), reduced ? 0 : 90 + step * 110);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0) scale(1)" : "translateY(10px) scale(.98)",
        transition: "opacity .55s ease, transform .55s cubic-bezier(.16,1,.3,1)",
      }}
    >
      {children}
    </div>
  );
}

export function ReportHeader({ card }: { card: RatedPlayerCard }) {
  const theme = resolveResultTheme(card.tier);
  const accent = theme.ink;
  const report = buildScoutReport(card);
  const position =
    card.player.position ?? card.player.role.slice(0, 3).toUpperCase();

  return (
    <header className="relative mx-auto mt-2 flex max-w-[640px] items-start gap-[clamp(16px,3vw,28px)]">
      <Stagger step={0} className="shrink-0">
        <div
          className="relative flex h-[clamp(78px,13vw,98px)] w-[clamp(78px,13vw,98px)] flex-col items-center justify-center rounded-2xl border bg-card shadow-sm"
          style={{
            borderColor: `${accent}55`,
            boxShadow: `0 8px 28px -10px ${rgba(accent, 0.35)}, inset 0 1px 0 ${rgba(accent, 0.15)}`,
          }}
        >
          <span
            className="font-display text-[clamp(34px,6vw,46px)] font-black leading-[.82] tabular-nums"
            style={{ color: accent }}
          >
            {card.overall}
          </span>
          <span className="font-display mt-0.5 text-[10px] font-bold tracking-[.22em] text-ink-faint">
            {TIER_LABELS[card.tier]}
          </span>
        </div>
      </Stagger>

      <div className="min-w-0 flex-1 text-left">
        <Stagger step={1} className="relative">
          <h2
            className="font-display truncate text-[clamp(28px,5vw,48px)] font-black leading-[.92]"
            style={{
              backgroundImage: `linear-gradient(100deg, ${accent} 0%, #0e1526 35%, ${accent} 50%, #0e1526 55%, ${accent} 100%)`,
              backgroundSize: "220% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "gf-name-shimmer 4.5s ease-in-out 0.6s both",
            }}
          >
            {card.player.fullname}
          </h2>
        </Stagger>

        <Stagger step={2}>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="font-display inline-flex items-center rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[12px] font-bold tracking-[.14em] text-accent">
              {position}
            </span>
            <span className="text-[13px] font-medium text-ink-soft">{card.archetype}</span>
            {card.player.team && (
              <span className="text-[12.5px] text-ink-faint">· {card.player.team}</span>
            )}
            {card.player.league && (
              <span className="text-[12.5px] text-ink-faint">· {card.player.league}</span>
            )}
          </div>
        </Stagger>

        <Stagger step={3}>
          <p className="mt-2 line-clamp-3 text-[13px] leading-[1.5] text-ink-soft">
            <span
              className="font-display mr-1.5 text-[11px] font-bold tracking-[.18em]"
              style={{ color: accent }}
            >
              {report.verdict.toUpperCase()}
            </span>
            {report.blurb}.
          </p>
        </Stagger>
      </div>
    </header>
  );
}

export function AttributesPanel({ card }: { card: RatedPlayerCard }) {
  const accent = resolveResultTheme(card.tier).ink;
  const report = buildScoutReport(card);

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Section title="ATTRIBUTES" accent={accent}>
        <AttributeRow label="Shot range">
          <StarRating value={report.skillMoves} accent={accent} />
        </AttributeRow>
        <AttributeRow label="Weak phase">
          <StarRating value={report.weakFoot} accent={accent} />
        </AttributeRow>
        <AttributeRow label="Work rate">
          <span>
            {report.workRate.attack} / {report.workRate.defense}
          </span>
        </AttributeRow>
        <AttributeRow label="Style">
          <span>{report.style}</span>
        </AttributeRow>
      </Section>

      <Section title="PLAYSTYLES" accent={accent}>
        <PlaystyleList playstyles={report.playstyles} accent={accent} />
      </Section>
    </div>
  );
}

export function MetricsPanel({ card }: { card: RatedPlayerCard }) {
  const accent = resolveResultTheme(card.tier).ink;
  const report = buildScoutReport(card);

  return (
    <Section title="SCOUTING METRICS" accent={accent} className="w-full">
      <div className="flex flex-col gap-[13px] pt-1">
        {report.metrics.map((m, i) => (
          <MetricBar key={m.label} metric={m} accent={accent} index={i} />
        ))}
      </div>
    </Section>
  );
}
