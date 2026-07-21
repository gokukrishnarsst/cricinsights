import type { CardTier } from "@/types/cricket";

export type RevealPhase = "rise" | "ignite" | "burst" | "freeze";

export interface RevealStep {
  phase: RevealPhase;
  at: number;
}

const BURST_TIERS: ReadonlySet<CardTier> = new Set<CardTier>([
  "toty",
  "icon",
  "totw",
]);

export function hasBurst(tier: CardTier): boolean {
  return BURST_TIERS.has(tier);
}

export function sequenceFor(
  tier: CardTier,
  reducedMotion: boolean,
): RevealStep[] {
  if (reducedMotion) return [{ phase: "freeze", at: 0 }];

  const steps: RevealStep[] = [
    { phase: "rise", at: 0 },
    { phase: "ignite", at: 620 },
  ];

  if (hasBurst(tier)) {
    steps.push({ phase: "burst", at: 1040 });
    steps.push({ phase: "freeze", at: 1560 });
  } else {
    steps.push({ phase: "freeze", at: 1180 });
  }

  return steps;
}
