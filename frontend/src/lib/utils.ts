import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function avatarUrl(name: string, seed?: string) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = seed ?? name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg.toString(16).padStart(6, "0").slice(0, 6)}&color=fff&size=320&bold=true`;
}

export function isUsableImageUrl(url: string | null | undefined): url is string {
  return Boolean(url && !/placeholder/i.test(url));
}

export function resolvePlayerPhoto(
  imagePath: string | null | undefined,
  name: string,
  seed?: string,
) {
  const fallbackUrl = avatarUrl(name, seed);
  return isUsableImageUrl(imagePath) ? imagePath : fallbackUrl;
}
