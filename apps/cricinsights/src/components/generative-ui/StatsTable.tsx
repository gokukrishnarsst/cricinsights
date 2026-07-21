'use client';

import { useMemo, useState } from 'react';
import type { StatsColumn, StatsTableData } from './types';
import { CardHeader, GlassCard } from './primitives';
import { normalizeStatsTableData } from '@/lib/stats-table-normalize';
import {
  cn,
  defaultStatsColumns,
  formatDecimal,
  formatNumber,
  statNum,
} from './utils';

interface StatsTableProps {
  data: StatsTableData;
  className?: string;
}

type SortDir = 'asc' | 'desc';

export function StatsTable({ data, className }: StatsTableProps) {
  const normalized = useMemo(
    () => normalizeStatsTableData(data as Record<string, unknown>),
    [data],
  );
  const columns: StatsColumn[] =
    (Array.isArray(normalized.columns) && normalized.columns.length
      ? (normalized.columns as StatsColumn[])
      : null) ??
    (data.columns?.length ? data.columns : null) ??
    defaultStatsColumns();
  const rows =
    (normalized.rows as StatsTableData['rows']) ?? data.rows ?? [];
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key ?? 'seasonName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const aNum = Number(av);
      const bNum = Number(bv);
      const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);
      let cmp = 0;
      if (bothNumeric) cmp = aNum - bNum;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortDir, sortKey]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <GlassCard className={cn('overflow-hidden p-4 sm:p-5', className)}>
      <CardHeader title={(normalized.title as string) ?? data.title ?? 'Statistics'} />

      <div className="overflow-x-auto -mx-1">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-mute uppercase">
              {columns.map((col) => (
                <th key={col.key} className={thClass(col)}>
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-accent-2"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      <span className="text-accent-2">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-6 text-center text-ink-mute"
                >
                  No stats available
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-line/50 transition-colors hover:bg-surface-2/60"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={tdClass(col)}>
                      {formatCell(
                        (row as Record<string, unknown>)[col.key],
                        col.format,
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function thClass(col: StatsColumn) {
  return cn(
    'px-3 py-2 font-medium',
    col.align === 'right' ? 'text-right' : 'text-left',
  );
}

function tdClass(col: StatsColumn) {
  return cn(
    'px-3 py-2 text-ink-soft',
    statNum,
    col.align === 'right' ? 'text-right' : 'text-left',
  );
}

function formatCell(value: unknown, format?: StatsColumn['format']) {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'number') return formatNumber(value);
  if (format === 'decimal') return formatDecimal(value);
  return String(value);
}
