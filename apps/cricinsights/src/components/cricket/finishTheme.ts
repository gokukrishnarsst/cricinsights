import type { CardTier } from '@/types/cricket';
import {
  CRICKET_CARD_MASK,
  resolveTierVisual,
  type TierVisual,
} from './card-tiers';

export { CRICKET_CARD_MASK, resolveTierVisual, leagueBadgeLabel } from './card-tiers';
export type { TierVisual };

/** @deprecated Use resolveTierVisual — kept for TiltCard mask compatibility */
export interface CardTheme {
  bg: string;
  ink: string;
  glow: string;
  avatarTint: string;
  avatarHalo: string;
}

function toLegacyTheme(visual: TierVisual): CardTheme {
  return {
    bg: CRICKET_CARD_MASK,
    ink: visual.ink,
    glow: visual.glow,
    avatarTint: visual.avatarTint,
    avatarHalo: visual.avatarHalo,
  };
}

export function resolveCardTheme(tier: CardTier): CardTheme {
  return toLegacyTheme(resolveTierVisual(tier));
}

export function resolveCardArtUrl(tier: CardTier): string {
  return resolveTierVisual(tier).art;
}

export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const f =
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const PAGE_ACCENT: Record<CardTier, string> = {
  bronze: '#8a5527',
  silver: '#57646f',
  gold: '#a97a08',
  totw: '#2563eb',
  toty: '#2563eb',
  icon: '#8a6d10',
};

export function pageAccent(tier: CardTier): string {
  return PAGE_ACCENT[tier];
}

export { tierDisplayLabel, TIER_DISPLAY_LABEL } from './card-tiers';
