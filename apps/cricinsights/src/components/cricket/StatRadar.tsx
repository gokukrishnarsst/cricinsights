'use client';

import { useState } from 'react';
import type { CardTier, CricketStats, StatKey } from '@/types/cricket';
import { STAT_LABELS } from '@/lib/scoring/engine';
import { pageAccent, rgba } from './finishTheme';

const STATS: StatKey[] = ['bat', 'con', 'pwr', 'dth', 'eco', 'wkt', 'clt'];
const SIZE = 150;

function polar(cx: number, cy: number, r: number, i: number, n: number) {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export default function StatRadar({
  stats,
  tier,
  rival,
}: {
  stats: CricketStats;
  tier: CardTier;
  rival?: { stats: CricketStats; tier: CardTier };
}) {
  const accent = pageAccent(tier);
  const [active, setActive] = useState<number | null>(null);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const radius = SIZE * 0.36;
  const n = STATS.length;

  const vertices = STATS.map((_, i) => {
    const v = stats[STATS[i]] / 99;
    return polar(cx, cy, radius * v, i, n);
  });

  const points = vertices.map((v) => `${v.x},${v.y}`).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    STATS.map((_, i) => {
      const p = polar(cx, cy, radius * f, i, n);
      return `${p.x},${p.y}`;
    }).join(' '),
  );

  const labels = STATS.map((k, i) => {
    const p = polar(cx, cy, radius + 18, i, n);
    return { ...p, label: STAT_LABELS[k], key: k };
  });

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full">
        {rings.map((ring, i) => (
          <polygon
            key={ring}
            points={ring}
            fill="none"
            stroke={
              i === rings.length - 1
                ? 'rgba(14,21,38,.16)'
                : 'rgba(14,21,38,.07)'
            }
          />
        ))}
        <polygon
          points={points}
          fill={rgba(accent, active !== null ? 0.18 : 0.28)}
          stroke={accent}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{ transition: 'fill .25s ease' }}
        />
        {vertices.map((v, i) => (
          <circle
            key={STATS[i]}
            cx={v.x}
            cy={v.y}
            r={active === i ? 3.6 : 2}
            fill={accent}
            style={{ transition: 'r .2s ease' }}
          />
        ))}
        {labels.map((l, i) => (
          <text
            key={l.label}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-display"
            fill={active === i ? accent : 'var(--color-ink-faint)'}
            style={{ fontSize: active === i ? 11 : 9.5 }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            {l.label}
          </text>
        ))}
      </svg>
      {active !== null && rival && (
        <div className="mt-1 text-center text-[10px] text-ink-soft">
          {stats[STATS[active]]} vs {rival.stats[STATS[active]]}
        </div>
      )}
    </div>
  );
}
