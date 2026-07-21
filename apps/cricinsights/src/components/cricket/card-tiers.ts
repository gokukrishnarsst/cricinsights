import type { CardTier } from '@/types/cricket';

/** Shared mask for avatar + tilt shine (cricket shield, not FUT hex). */
export const CRICKET_CARD_MASK = '/cards/cricket-shield-mask.svg';

export interface TierVisual {
  art: string;
  ink: string;
  glow: string;
  avatarTint: string;
  avatarHalo: string;
  premium: boolean;
}

export const TIER_VISUAL: Record<CardTier, TierVisual> = {
  bronze: {
    art: '/cards/bronze.svg',
    ink: '#3a2717',
    glow: 'rgba(160,100,55,.45)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(106,69,39,.26) 78%, rgba(50,31,14,.44))',
    avatarHalo: 'rgba(214,163,110,.4)',
    premium: false,
  },
  silver: {
    art: '/cards/silver.svg',
    ink: '#2a3340',
    glow: 'rgba(170,188,210,.5)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(170,188,210,.22) 78%, rgba(70,78,90,.42))',
    avatarHalo: 'rgba(220,228,238,.4)',
    premium: false,
  },
  gold: {
    art: '/cards/gold.svg',
    ink: '#46390c',
    glow: 'rgba(225,185,80,.55)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(243,214,121,.24) 78%, rgba(156,118,33,.44))',
    avatarHalo: 'rgba(243,214,121,.45)',
    premium: true,
  },
  totw: {
    art: '/cards/toty.svg',
    ink: '#1e3a5f',
    glow: 'rgba(90,140,255,.55)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(74,120,210,.22) 78%, rgba(14,35,80,.46))',
    avatarHalo: 'rgba(127,168,255,.45)',
    premium: true,
  },
  toty: {
    art: '/cards/toty.svg',
    ink: '#1e3a5f',
    glow: 'rgba(90,140,255,.55)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(74,120,210,.22) 78%, rgba(14,35,80,.46))',
    avatarHalo: 'rgba(127,168,255,.45)',
    premium: true,
  },
  icon: {
    art: '/cards/legend.svg',
    ink: '#625217',
    glow: 'rgba(243,213,128,.5)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(243,214,121,.24) 78%, rgba(120,90,30,.46))',
    avatarHalo: 'rgba(243,214,136,.5)',
    premium: true,
  },
};

export function resolveTierVisual(tier: CardTier): TierVisual {
  return TIER_VISUAL[tier];
}

export function leagueBadgeLabel(league?: string): string {
  if (!league) return 'T20';
  if (league.length <= 4 && league === league.toUpperCase()) return league;
  if (/ipl/i.test(league)) return 'IPL';
  if (/hundred/i.test(league)) return '100';
  if (/big bash/i.test(league)) return 'BBL';
  if (/pakistan super/i.test(league)) return 'PSL';
  return league.slice(0, 3).toUpperCase();
}

/** Cricket-facing tier labels (not FUT rarity names). */
export const TIER_DISPLAY_LABEL: Record<CardTier, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  totw: 'TEAM OF WEEK',
  toty: 'TEAM OF YEAR',
  icon: 'LEGEND',
};

export function tierDisplayLabel(tier: CardTier): string {
  return TIER_DISPLAY_LABEL[tier];
}
