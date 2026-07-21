'use client';

import { useMemo, useState } from 'react';
import type { LeaderboardRow, LeaderboardTableData } from './types';
import { CardHeader, GlassCard } from './primitives';
import {
  isStandingsShape,
  normalizeLeaderboardRow,
} from '@/lib/leaderboard-normalize';
import {
  cn,
  formatDecimal,
  formatNumber,
  leaderboardRows,
  statNum,
} from './utils';

interface LeaderboardTableProps {
  data: LeaderboardTableData;
  className?: string;
}

type SortKey = 'rank' | 'name' | 'value';

export function LeaderboardTable({ data, className }: LeaderboardTableProps) {
  const rawRows = leaderboardRows(data).map((row) =>
    normalizeLeaderboardRow(row as Record<string, unknown>),
  );
  const isStandings = rawRows.some((r) => isStandingsShape(r));
  const [sortKey, setSortKey] = useState<SortKey>(isStandings ? 'rank' : 'value');
  const [sortAsc, setSortAsc] = useState(true);

  const rows = useMemo(() => {
    const normalized = rawRows.map((row, idx) => normalizeRow(row, idx, isStandings));
    return [...normalized].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'value') cmp = a.value - b.value;
      else cmp = a.rank - b.rank;
      return sortAsc ? cmp : -cmp;
    });
  }, [rawRows, sortAsc, sortKey, isStandings]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  }

  return (
    <GlassCard className={cn('overflow-hidden p-4 sm:p-5', className)}>
      <CardHeader
        title={data.title ?? (isStandings ? 'Standings' : 'Leaderboard')}
        subtitle={data.metric ? `Metric: ${data.metric.replace(/_/g, ' ')}` : undefined}
      />

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-mute uppercase">
              <SortTh label="#" active={sortKey === 'rank'} asc={sortAsc} onClick={() => toggleSort('rank')} />
              <SortTh label={isStandings ? 'Team' : 'Player'} active={sortKey === 'name'} asc={sortAsc} onClick={() => toggleSort('name')} align="left" />
              {!isStandings ? (
                <th className="px-3 py-2 text-left font-medium">Team</th>
              ) : (
                <>
                  <th className="px-3 py-2 text-right font-medium">P</th>
                  <th className="px-3 py-2 text-right font-medium">W</th>
                  <th className="px-3 py-2 text-right font-medium">L</th>
                  <th className="px-3 py-2 text-right font-medium">NRR</th>
                </>
              )}
              <SortTh
                label={isStandings ? 'Pts' : 'Value'}
                active={sortKey === 'value'}
                asc={sortAsc}
                onClick={() => toggleSort('value')}
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isStandings ? 8 : 4} className="py-6 text-center text-ink-mute">
                  No entries
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.rank}-${row.name}`}
                  className="border-b border-line/50 hover:bg-surface-2/60"
                >
                  <td className={cn('px-3 py-2 text-center font-semibold text-accent-2', statNum)}>
                    {row.rank}
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{row.name}</td>
                  {!isStandings ? (
                    <td className="px-3 py-2 text-ink-mute">{row.team ?? '—'}</td>
                  ) : (
                    <>
                      <td className={cn('px-3 py-2 text-right text-ink-soft', statNum)}>
                        {formatNumber(row.played)}
                      </td>
                      <td className={cn('px-3 py-2 text-right text-emerald', statNum)}>
                        {formatNumber(row.won)}
                      </td>
                      <td className={cn('px-3 py-2 text-right text-rose', statNum)}>
                        {formatNumber(row.lost)}
                      </td>
                      <td className={cn('px-3 py-2 text-right text-ink-soft', statNum)}>
                        {formatDecimal(row.nrr, 3)}
                      </td>
                    </>
                  )}
                  <td className={cn('px-3 py-2 text-right font-semibold text-gold', statNum)}>
                    {formatNumber(row.value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function SortTh({
  label,
  active,
  asc,
  onClick,
  align = 'right',
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th className={cn('px-3 py-2 font-medium', align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right')}>
      <button type="button" onClick={onClick} className="hover:text-accent-2">
        {label}
        {active ? (asc ? ' ↑' : ' ↓') : null}
      </button>
    </th>
  );
}

function normalizeRow(row: LeaderboardRow, idx: number, _isStandings: boolean) {
  const normalized = normalizeLeaderboardRow(row as Record<string, unknown>);
  const rank = normalized.rank ?? normalized.position ?? idx + 1;
  const name =
    normalized.playerName ?? normalized.teamName ?? '—';
  const value = normalized.value ?? normalized.points ?? 0;
  return {
    rank: Number(rank),
    name: String(name),
    team: normalized.teamName ?? '—',
    value: Number(value),
    played: normalized.played,
    won: normalized.won,
    lost: normalized.lost,
    nrr: normalized.netRunRate,
  };
}
