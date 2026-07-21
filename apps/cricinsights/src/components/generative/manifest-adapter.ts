'use client';

import type {
  LeagueComparisonResult,
  PlayerComparison,
  RatedPlayerCard,
} from '@/types/cricket';
import type { UIComponent } from '@/types/generative-ui';
import type { UIComponent as ManifestComponent } from '@/lib/template-engine';
import { defaultStatsColumns } from '@/components/generative-ui/utils';
import {
  normalizeStatsRows,
  coalesceStatsTableRows,
  statsRowCellValue,
} from '@/lib/stats-table-normalize';
import {
  dismissalBreakdownColumns,
  isDismissalBreakdownRows,
  normalizeDismissalRows,
} from '@/lib/dismissal-table';

function normalizeType(type: string): string {
  return type
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isRatedPlayerCard(value: unknown): value is RatedPlayerCard {
  if (!isRecord(value)) return false;
  const player = value.player;
  return (
    isRecord(player) &&
    typeof player.fullname === 'string' &&
    typeof value.overall === 'number' &&
    typeof value.tier === 'string' &&
    isRecord(value.stats)
  );
}

function isPlayerComparison(value: unknown): value is PlayerComparison {
  if (!isRecord(value)) return false;
  return (
    isRatedPlayerCard(value.playerA) && isRatedPlayerCard(value.playerB)
  );
}

/** Flat generative component (frontend / agent rich UI). */
export function isFlatUIComponent(
  item: Record<string, unknown>,
): item is UIComponent & Record<string, unknown> {
  if (!item.type || typeof item.type !== 'string') return false;
  if ('data' in item && isRecord(item.data)) return false;
  const type = normalizeType(item.type);
  if (type === 'text') return typeof item.content === 'string';
  if (type === 'player_card') return isRatedPlayerCard(item.card);
  if (type === 'comparison_card') return isPlayerComparison(item.comparison);
  return UI_FLAT_TYPES.has(type);
}

const UI_FLAT_TYPES = new Set([
  'league_comparison',
  'stats_table',
  'radar_chart',
  'bar_comparison',
  'insight_card',
  'insight_grid',
  'venue_insights',
  'phase_breakdown',
  'data_scope',
  'strengths_gaps',
  'career_stats',
]);

function careerRowsToTable(
  rows: Record<string, unknown>[],
): { headers: string[]; tableRows: (string | number)[][] } {
  if (isDismissalBreakdownRows(rows)) {
    const columns = dismissalBreakdownColumns();
    const headers = columns.map((c) => c.label);
    const normalized = normalizeDismissalRows(rows);
    const tableRows = normalized.map((row) =>
      columns.map((col) => {
        const raw = row[col.key];
        if (raw === null || raw === undefined || raw === '') return '—';
        if (col.format === 'decimal') return Number(raw).toFixed(1);
        if (col.format === 'number') return Number(raw);
        return String(raw);
      }),
    );
    return { headers, tableRows };
  }

  const columns = defaultStatsColumns();
  const headers = columns.map((c) => c.label);
  const normalized = normalizeStatsRows(rows);
  const tableRows = normalized.map((row) =>
    columns.map((col) => {
      const raw = statsRowCellValue(row, col.key);
      if (raw === null || raw === undefined || raw === '') return '—';
      if (col.format === 'decimal') return Number(raw).toFixed(1);
      if (col.format === 'number') return Number(raw);
      return String(raw);
    }),
  );
  return { headers, tableRows };
}

/**
 * Map chat manifest `{ type, data }` into typed generative UI when possible.
 */
export function adaptManifestComponent(
  component: ManifestComponent,
): UIComponent | null {
  const type = normalizeType(component.type);
  const data = component.data ?? {};

  if (type === 'text' && typeof data.content === 'string') {
    return { type: 'text', content: data.content };
  }

  if (type === 'player_card') {
    if (isRatedPlayerCard(data.card)) {
      return { type: 'player_card', card: data.card };
    }
    if (isRatedPlayerCard(data)) {
      return { type: 'player_card', card: data };
    }
    return null;
  }

  if (type === 'comparison_card') {
    if (isPlayerComparison(data.comparison)) {
      return {
        type: 'comparison_card',
        comparison: data.comparison,
        insights: Array.isArray(data.insights)
          ? (data.insights as string[])
          : undefined,
      };
    }
    if (isPlayerComparison(data)) {
      return { type: 'comparison_card', comparison: data };
    }
    return null;
  }

  if (type === 'league_comparison' && Array.isArray(data.metrics)) {
    return {
      type: 'league_comparison',
      data: {
        metrics: data.metrics as LeagueComparisonResult['metrics'],
        summary: String(data.summary ?? ''),
      },
      leagueA: typeof data.leagueA === 'string' ? data.leagueA : undefined,
      leagueB: typeof data.leagueB === 'string' ? data.leagueB : undefined,
    };
  }

  if (type === 'stats_table' || type === 'h2h_stats_table') {
    if (Array.isArray(data.headers) && Array.isArray(data.rows)) {
      return {
        type: 'stats_table',
        title: typeof data.title === 'string' ? data.title : undefined,
        headers: data.headers as string[],
        rows: data.rows as (string | number)[][],
      };
    }
    const rowList = coalesceStatsTableRows(data);
    if (rowList.length > 0 && isRecord(rowList[0])) {
      const { headers, tableRows } = careerRowsToTable(rowList);
      return {
        type: 'stats_table',
        title: typeof data.title === 'string' ? data.title : undefined,
        headers,
        rows: tableRows,
      };
    }
    if (typeof data.rawText === 'string') {
      return { type: 'text', content: data.rawText };
    }
    return null;
  }

  if (type === 'insight_card') {
    return {
      type: 'insight_card',
      title: String(data.title ?? 'Insight'),
      content: String(data.content ?? data.text ?? ''),
      severity:
        data.severity === 'info' ||
        data.severity === 'warning' ||
        data.severity === 'success' ||
        data.severity === 'error'
          ? data.severity
          : undefined,
    };
  }

  if (
    type === 'venue_insights' &&
    isRecord(data.venue) &&
    isRecord(data.summary) &&
    typeof (data.venue as { name?: string }).name === 'string'
  ) {
    return {
      type: 'venue_insights',
      venue: data.venue as Extract<
        UIComponent,
        { type: 'venue_insights' }
      >['venue'],
      league: typeof data.league === 'string' ? data.league : undefined,
      summary: data.summary as Extract<
        UIComponent,
        { type: 'venue_insights' }
      >['summary'],
      topBatters: Array.isArray(data.topBatters)
        ? (data.topBatters as Extract<
            UIComponent,
            { type: 'venue_insights' }
          >['topBatters'])
        : undefined,
      topBowlers: Array.isArray(data.topBowlers)
        ? (data.topBowlers as Extract<
            UIComponent,
            { type: 'venue_insights' }
          >['topBowlers'])
        : undefined,
    };
  }

  if (type === 'phase_breakdown' && Array.isArray(data.phases)) {
    return {
      type: 'phase_breakdown',
      title: typeof data.title === 'string' ? data.title : undefined,
      phases: data.phases as Extract<
        UIComponent,
        { type: 'phase_breakdown' }
      >['phases'],
    };
  }

  if (type === 'data_scope') {
    return {
      type: 'data_scope',
      scope: typeof data.scope === 'string' ? data.scope : undefined,
      limitations: Array.isArray(data.limitations)
        ? (data.limitations as string[])
        : undefined,
      source: typeof data.source === 'string' ? data.source : undefined,
    };
  }

  if (type === 'strengths_gaps' && isRecord(data.intelligence)) {
    return {
      type: 'strengths_gaps',
      intelligence: data.intelligence as unknown as Extract<
        UIComponent,
        { type: 'strengths_gaps' }
      >['intelligence'],
    };
  }

  if (type === 'career_stats' && isRecord(data.career)) {
    return {
      type: 'career_stats',
      career: data.career as unknown as Extract<
        UIComponent,
        { type: 'career_stats' }
      >['career'],
    };
  }

  if (type === 'radar_chart' && Array.isArray(data.data)) {
    return {
      type: 'radar_chart',
      title: typeof data.title === 'string' ? data.title : undefined,
      data: data.data as { label: string; value: number }[],
    };
  }

  if (type === 'bar_comparison' && Array.isArray(data.values)) {
    return {
      type: 'bar_comparison',
      title: typeof data.title === 'string' ? data.title : undefined,
      metric: String(data.metric ?? 'Value'),
      values: data.values as { label: string; value: number }[],
    };
  }

  return null;
}

export function manifestItemToUI(
  component: ManifestComponent | (UIComponent & Record<string, unknown>),
): UIComponent | null {
  if (isFlatUIComponent(component as Record<string, unknown>)) {
    return component as UIComponent;
  }
  if ('data' in component && isRecord(component.data)) {
    return adaptManifestComponent(component as ManifestComponent);
  }
  return null;
}

export function isWideManifestType(type: string): boolean {
  const normalized = normalizeType(type);
  return (
    normalized === 'comparison_card' ||
    normalized === 'league_comparison' ||
    normalized === 'venue_insights' ||
    normalized === 'scorecard_view' ||
    normalized === 'leaderboard_table' ||
    normalized === 'h2h_stats_table'
  );
}

export function isWideManifest(manifest?: {
  components: ManifestComponent[];
} | null): boolean {
  if (!manifest?.components?.length) return false;
  return manifest.components.some((c) => isWideManifestType(c.type));
}
