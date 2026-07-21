#!/usr/bin/env node
/**
 * Writes cricket-themed card template SVGs (shield + stumps watermark + leather stitch).
 * Run: node apps/cricinsights/scripts/generate-cricket-card-svgs.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/cards');
mkdirSync(outDir, { recursive: true });

const SHIELD =
  'M270 24 C392 24 478 108 498 248 L512 698 C514 748 480 792 430 808 L270 818 L110 808 C60 792 26 748 28 698 L42 248 C62 108 148 24 270 24 Z';

const STUMPS = `
  <g opacity="0.09" fill="none" stroke="#0e1526" stroke-width="6" stroke-linecap="round">
    <line x1="230" y1="520" x2="230" y2="680"/>
    <line x1="270" y1="500" x2="270" y2="680"/>
    <line x1="310" y1="520" x2="310" y2="680"/>
    <line x1="218" y1="680" x2="322" y2="680"/>
  </g>`;

const STITCH = `
  <path d="M80 180 Q270 220 460 180" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-dasharray="8 10"/>
  <path d="M70 420 Q270 460 470 420" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="2" stroke-dasharray="6 8"/>
  <path d="M90 600 Q270 640 450 600" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-dasharray="8 10"/>`;

const LEAGUE_SLOT = `
  <rect x="88" y="268" width="80" height="48" rx="8" fill="rgba(255,255,255,0.35)" stroke="rgba(14,21,38,0.15)" stroke-width="2"/>
  <text x="128" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="rgba(14,21,38,0.35)">LEAGUE</text>`;

const tiers = {
  bronze: {
    file: 'bronze.svg',
    grad: ['#c4956a', '#8b5a2b', '#5c3d1e'],
    accent: '#a66b3a',
  },
  silver: {
    file: 'silver.svg',
    grad: ['#eef2f8', '#b8c4d4', '#7a8798'],
    accent: '#9aa8ba',
  },
  gold: {
    file: 'gold.svg',
    grad: ['#fff4c2', '#e8c547', '#b8860b'],
    accent: '#c9930f',
  },
  toty: {
    file: 'toty.svg',
    grad: ['#dbeafe', '#3b82f6', '#1e3a8a'],
    accent: '#2563eb',
  },
  legend: {
    file: 'legend.svg',
    grad: ['#fff9e6', '#f3d688', '#9a6b00'],
    accent: '#c9930f',
  },
};

for (const spec of Object.values(tiers)) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 820">
  <defs>
    <linearGradient id="leather" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${spec.grad[0]}"/>
      <stop offset="45%" stop-color="${spec.grad[1]}"/>
      <stop offset="100%" stop-color="${spec.grad[2]}"/>
    </linearGradient>
    <pattern id="seam" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="24" stroke="rgba(255,255,255,0.08)" stroke-width="4"/>
    </pattern>
    <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>
  <path d="${SHIELD}" fill="url(#leather)" filter="url(#innerShadow)"/>
  <path d="${SHIELD}" fill="url(#seam)" opacity="0.55"/>
  ${STUMPS}
  ${STITCH}
  <path d="${SHIELD}" fill="none" stroke="${spec.accent}" stroke-width="4" opacity="0.65"/>
  ${LEAGUE_SLOT}
</svg>`;
  writeFileSync(join(outDir, spec.file), svg, 'utf8');
}

console.log(`Wrote cricket card SVGs to ${outDir}`);
