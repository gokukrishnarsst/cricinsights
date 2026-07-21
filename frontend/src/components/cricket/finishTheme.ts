import type { CardTier } from "@/types/cricket";

export function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface CardTheme {
  bg: string;
  ink: string;
  glow: string;
  avatarTint: string;
  avatarHalo: string;
}

export const CARD_THEME: Record<CardTier, CardTheme> = {
  bronze: {
    bg: "/cards/bronze.png",
    ink: "#3a2717",
    glow: "rgba(190,120,60,.45)",
    avatarTint:
      "radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(106,69,39,.26) 78%, rgba(50,31,14,.44))",
    avatarHalo: "rgba(214,163,110,.4)",
  },
  silver: {
    bg: "/cards/silver.png",
    ink: "#303536",
    glow: "rgba(170,188,210,.5)",
    avatarTint:
      "radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(170,188,210,.22) 78%, rgba(70,78,90,.42))",
    avatarHalo: "rgba(220,228,238,.4)",
  },
  gold: {
    bg: "/cards/gold.png",
    ink: "#46390c",
    glow: "rgba(225,185,80,.55)",
    avatarTint:
      "radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(243,214,121,.24) 78%, rgba(156,118,33,.44))",
    avatarHalo: "rgba(243,214,121,.45)",
  },
  totw: {
    bg: "/cards/toty.webp",
    ink: "#ebcd5b",
    glow: "rgba(90,140,255,.55)",
    avatarTint:
      "radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(74,120,210,.22) 78%, rgba(14,35,80,.46))",
    avatarHalo: "rgba(127,168,255,.45)",
  },
  toty: {
    bg: "/cards/toty.webp",
    ink: "#ebcd5b",
    glow: "rgba(90,140,255,.55)",
    avatarTint:
      "radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(74,120,210,.22) 78%, rgba(14,35,80,.46))",
    avatarHalo: "rgba(127,168,255,.45)",
  },
  icon: {
    bg: "/cards/legend.png",
    ink: "#625217",
    glow: "rgba(243,213,128,.5)",
    avatarTint:
      "radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(243,214,121,.24) 78%, rgba(120,90,30,.46))",
    avatarHalo: "rgba(243,214,136,.5)",
  },
};

export function resolveCardTheme(tier: CardTier): CardTheme {
  return CARD_THEME[tier];
}

// On-page tier accents readable on the light theme. The card art keeps its
// original FUT ink (CARD_THEME.ink); these drive names, scores and bars that
// sit on the page itself, where pale inks like TOTY's #ebcd5b would vanish.
const PAGE_ACCENT: Record<CardTier, string> = {
  bronze: "#8a5527",
  silver: "#57646f",
  gold: "#a97a08",
  totw: "#2563eb",
  toty: "#2563eb",
  icon: "#8a6d10",
};

export function pageAccent(tier: CardTier): string {
  return PAGE_ACCENT[tier];
}

export interface ResultTheme {
  ink: string;
  glow: string;
}

export function resolveResultTheme(tier: CardTier): ResultTheme {
  return {
    ink: pageAccent(tier),
    glow: CARD_THEME[tier].glow,
  };
}

export function confettiPalette(tier: CardTier): string[] {
  const accent = pageAccent(tier);
  return [accent, "#2563eb", "#0891b2", "#c9930f", "#059669"];
}
