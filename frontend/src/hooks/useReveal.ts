"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { CardTier } from "@/types/cricket";
import { type RevealPhase, sequenceFor } from "@/lib/reveal";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useReveal(tier: CardTier): RevealPhase {
  const [phase, setPhase] = useState<RevealPhase>(
    () => sequenceFor(tier, false)[0]?.phase ?? "rise",
  );

  useIsomorphicLayoutEffect(() => {
    const steps = sequenceFor(tier, prefersReducedMotion());
    setPhase(steps[0].phase);
    const timers = steps
      .slice(1)
      .map((s) => setTimeout(() => setPhase(s.phase), s.at));
    return () => timers.forEach(clearTimeout);
  }, [tier]);

  return phase;
}
