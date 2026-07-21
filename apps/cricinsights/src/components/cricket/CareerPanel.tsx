'use client';

import type {
  FormatBatting,
  FormatBowling,
  PlayerCareerReport,
} from '@/types/cricket';

function BatRow({ label, b }: { label: string; b: FormatBatting }) {
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="px-3 py-2 font-semibold text-ink">{label}</td>
      <td className="px-3 py-2 text-ink-dim">{b.matches}</td>
      <td className="px-3 py-2 text-ink-dim">{b.runs}</td>
      <td className="px-3 py-2 text-ink-dim">{b.average}</td>
      <td className="px-3 py-2 text-ink-dim">{b.strikeRate}</td>
      <td className="px-3 py-2 text-ink-dim">
        {b.hundreds}/{b.fifties}
      </td>
      <td className="px-3 py-2 text-ink-dim">{b.highest}</td>
    </tr>
  );
}

function BowlRow({ label, b }: { label: string; b: FormatBowling }) {
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="px-3 py-2 font-semibold text-ink">{label}</td>
      <td className="px-3 py-2 text-ink-dim">{b.matches}</td>
      <td className="px-3 py-2 text-ink-dim">{b.wickets}</td>
      <td className="px-3 py-2 text-ink-dim">{b.average}</td>
      <td className="px-3 py-2 text-ink-dim">{b.economy}</td>
      <td className="px-3 py-2 text-ink-dim">{b.strikeRate}</td>
      <td className="px-3 py-2 text-ink-dim">{b.best}</td>
    </tr>
  );
}

export default function CareerPanel({ career }: { career: PlayerCareerReport }) {
  const { player, formatStats, coachStrengths, coachGaps, bioSummary } = career;
  const batFormats = [
    formatStats.test?.batting && { label: 'Test', data: formatStats.test.batting },
    formatStats.odi?.batting && { label: 'ODI', data: formatStats.odi.batting },
    formatStats.t20i?.batting && { label: 'T20I', data: formatStats.t20i.batting },
  ].filter(Boolean) as { label: string; data: FormatBatting }[];

  const bowlFormats = [
    formatStats.test?.bowling && { label: 'Test', data: formatStats.test.bowling },
    formatStats.odi?.bowling && { label: 'ODI', data: formatStats.odi.bowling },
    formatStats.t20i?.bowling && { label: 'T20I', data: formatStats.t20i.bowling },
  ].filter(Boolean) as { label: string; data: FormatBowling }[];

  return (
    <section className="space-y-5">
      <div>
        <div className="eyebrow mb-2 !text-accent">Career Profile</div>
        <h3 className="font-display text-2xl font-black tracking-wide">
          {player.fullname.toUpperCase()}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          {bioSummary}
        </p>
      </div>

      {batFormats.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="border-b border-line bg-surface-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Batting by format
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Mat</th>
                <th className="px-3 py-2">Runs</th>
                <th className="px-3 py-2">Avg</th>
                <th className="px-3 py-2">SR</th>
                <th className="px-3 py-2">100/50</th>
                <th className="px-3 py-2">HS</th>
              </tr>
            </thead>
            <tbody>
              {batFormats.map((f) => (
                <BatRow key={f.label} label={f.label} b={f.data} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bowlFormats.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="border-b border-line bg-surface-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Bowling by format
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Mat</th>
                <th className="px-3 py-2">Wkts</th>
                <th className="px-3 py-2">Avg</th>
                <th className="px-3 py-2">Eco</th>
                <th className="px-3 py-2">SR</th>
                <th className="px-3 py-2">Best</th>
              </tr>
            </thead>
            <tbody>
              {bowlFormats.map((f) => (
                <BowlRow key={f.label} label={f.label} b={f.data} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-4">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-emerald">
            Strengths
          </div>
          <ul className="space-y-2 text-[13px] text-ink-soft">
            {coachStrengths.map((s) => (
              <li key={s.label}>
                <span className="font-semibold text-ink">{s.label}:</span>{' '}
                {s.evidence}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-4">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-rose">
            Development areas
          </div>
          <ul className="space-y-2 text-[13px] text-ink-soft">
            {coachGaps.map((g) => (
              <li key={g.label}>
                <span className="font-semibold text-ink">{g.label}:</span>{' '}
                {g.evidence}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
