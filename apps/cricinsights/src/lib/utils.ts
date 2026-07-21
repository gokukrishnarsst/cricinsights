import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function avatarUrl(name: string, seed: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256&seed=${seed}`;
}
