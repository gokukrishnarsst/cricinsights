import type { ChatManifest } from '@/lib/template-engine.js';

export type WeaknessCode =
  | 'ROUTE_MISMATCH'
  | 'INTENT_MISMATCH'
  | 'MISSING_COMPONENT'
  | 'EMPTY_HIGHLIGHTS'
  | 'EMPTY_STATS_TABLE'
  | 'EMPTY_LEADERBOARD_TABLE'
  | 'MISSING_SCOUT_UI'
  | 'NARRATIVE_FALSE_UNAVAILABLE'
  | 'FAST_PATH_ERROR'
  | 'AI_WHEN_FAST_POSSIBLE'
  | 'UNSUPPORTED_COMPONENT';

export interface WeaknessFinding {
  code: WeaknessCode;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  hint?: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cellEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '' || v === '—';
}

export function detectManifestWeaknesses(
  manifest: ChatManifest,
  context: {
    query: string;
    watchFor?: string[];
  },
): WeaknessFinding[] {
  const findings: WeaknessFinding[] = [];
  const watch = new Set(context.watchFor ?? []);

  const narrative = manifest.narrative ?? '';
  const components = manifest.components ?? [];

  for (const component of components) {
    if (
      component.type === 'error_card' ||
      (component.type !== 'insight_card' &&
        component.type.includes('unknown'))
    ) {
      findings.push({
        code: 'UNSUPPORTED_COMPONENT',
        severity: 'high',
        message: `Unsupported or legacy component type: ${component.type}`,
        hint: 'Add renderer or map to insight_card in ManifestRenderer.',
      });
    }
  }

  const playerCard = components.find((c) => c.type === 'player_card');
  if (playerCard) {
    const h = (playerCard.data?.highlights ?? {}) as Record<string, unknown>;
    const runs = num(h.totalBattingRuns);
    const seasons = num(h.seasonsTracked);
    if (
      runs === 0 &&
      seasons === 0 &&
      (watch.has('EMPTY_HIGHLIGHTS') ||
        /\b(stats|kohli|player|scout|strength)/i.test(context.query))
    ) {
      findings.push({
        code: 'EMPTY_HIGHLIGHTS',
        severity: 'critical',
        message: 'Player card shows 0 runs and 0 seasons despite a player-focused query.',
        hint: 'Fix manifest hydration, fast-path highlights, or AI prompt to copy tool highlights.',
      });
    }
  }

  const statsTable = components.find(
    (c) => c.type === 'stats_table' || c.type === 'h2h_stats_table',
  );
  if (statsTable && watch.has('EMPTY_STATS_TABLE')) {
    const rows = (statsTable.data?.rows ?? []) as Record<string, unknown>[];
    if (rows.length > 0) {
      const keys = [
        'battingRuns',
        'seasonName',
        'runs',
        'average',
        'teamName',
        'points',
        'label',
        'count',
        'percentage',
      ];
      const allEmpty = rows.every((row) =>
        keys.every((k) => cellEmpty(row[k])),
      );
      if (allEmpty) {
        findings.push({
          code: 'EMPTY_STATS_TABLE',
          severity: 'high',
          message: 'Stats table has rows but no recognizable numeric/text fields (schema mismatch).',
          hint: 'Use stats-table-normalize / dismissal-table or pass tool-shaped rows.',
        });
      }
    }
  }

  const leaderboard = components.find((c) => c.type === 'leaderboard_table');
  if (leaderboard && watch.has('EMPTY_LEADERBOARD_TABLE')) {
    const rows = (leaderboard.data?.rows ??
      leaderboard.data?.standings ??
      []) as Record<string, unknown>[];
    if (rows.length > 0) {
      const namesEmpty = rows.every(
        (r) =>
          cellEmpty(r.teamName) &&
          cellEmpty(r.playerName) &&
          cellEmpty(r.team) &&
          cellEmpty(r.name),
      );
      if (namesEmpty) {
        findings.push({
          code: 'EMPTY_LEADERBOARD_TABLE',
          severity: 'high',
          message: 'Leaderboard/standings rows missing team/player names (LLM key mismatch).',
          hint: 'leaderboard-normalize.ts or canonical keys in agent prompt.',
        });
      }
    }
  }

  if (
    watch.has('MISSING_SCOUT_UI') &&
    !components.some((c) => c.type === 'strengths_gaps')
  ) {
    findings.push({
      code: 'MISSING_SCOUT_UI',
      severity: 'critical',
      message: 'Scouting query but no strengths_gaps / IntelligencePanel component.',
      hint: 'Route to player_scout fast path or hydrate from player_dismissal_analysis.',
    });
  }

  if (
    watch.has('NARRATIVE_FALSE_UNAVAILABLE') &&
    /unavailable|no data|incomplete scorecard/i.test(narrative) &&
    playerCard &&
    num((playerCard.data?.highlights as Record<string, unknown>)?.totalBattingRuns) >
      0
  ) {
    findings.push({
      code: 'NARRATIVE_FALSE_UNAVAILABLE',
      severity: 'medium',
      message: 'Narrative claims unavailable/incomplete but manifest has positive run totals.',
      hint: 'Separate scorecard-coverage notes from career aggregates in prompts/hydration.',
    });
  }

  return findings;
}

export function detectRoutingWeaknesses(
  scenario: { expectRoute?: string; expectIntent?: string; watchFor?: string[] },
  actual: { route: string; intent: string },
): WeaknessFinding[] {
  const findings: WeaknessFinding[] = [];
  if (
    scenario.expectRoute &&
    scenario.expectRoute !== actual.route
  ) {
    findings.push({
      code: 'ROUTE_MISMATCH',
      severity: scenario.expectRoute === 'fast_path' ? 'high' : 'medium',
      message: `Expected route ${scenario.expectRoute}, got ${actual.route} (intent ${actual.intent}).`,
      hint:
        actual.route === 'ai_path' && scenario.expectRoute === 'fast_path'
          ? 'Extend SmartRouter patterns or accept slower AI path with hydration.'
          : undefined,
    });
  }
  if (
    scenario.expectIntent &&
    scenario.expectIntent !== actual.intent
  ) {
    findings.push({
      code: 'INTENT_MISMATCH',
      severity: 'medium',
      message: `Expected intent ${scenario.expectIntent}, got ${actual.intent}.`,
    });
  }
  if (
    scenario.watchFor?.includes('AI_WHEN_FAST_POSSIBLE') &&
    actual.route === 'ai_path' &&
    scenario.expectRoute === 'fast_path'
  ) {
    findings.push({
      code: 'AI_WHEN_FAST_POSSIBLE',
      severity: 'low',
      message: 'Query could be fast-path if season/league IDs were resolved in router.',
      hint: 'Add resolve_season to fast path or cache IPL season_id in LEAGUE_HINTS.',
    });
  }
  return findings;
}

export function detectMissingComponents(
  expected: string[] | undefined,
  manifest: ChatManifest,
): WeaknessFinding[] {
  if (!expected?.length) return [];
  const types = new Set(manifest.components.map((c) => c.type));
  return expected
    .filter((t) => !types.has(t))
    .map((t) => ({
      code: 'MISSING_COMPONENT' as const,
      severity: 'high' as const,
      message: `Expected component "${t}" not in manifest.`,
      hint: 'Check template-engine manifest builder for this intent.',
    }));
}

/** Group findings for executive summary. */
export function summarizeByCategory(findings: WeaknessFinding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.code] = (counts[f.code] ?? 0) + 1;
  }
  return counts;
}

export const IMPROVEMENT_HINTS: Record<
  WeaknessCode,
  { area: 'router' | 'mcp-local' | 'agent' | 'ui' | 'data'; action: string }
> = {
  ROUTE_MISMATCH: {
    area: 'router',
    action: 'Add/adjust SmartRouter rules or league/season hints.',
  },
  INTENT_MISMATCH: { area: 'router', action: 'Align intent enum with fast-path handler cases.' },
  MISSING_COMPONENT: {
    area: 'ui',
    action: 'Extend template-engine manifest for this intent.',
  },
  EMPTY_HIGHLIGHTS: {
    area: 'agent',
    action: 'Hydrate player_card from tool output; prefer fast path for stats/scout.',
  },
  EMPTY_STATS_TABLE: {
    area: 'ui',
    action: 'Normalize row keys (stats-table-normalize) or fix agent prompt shapes.',
  },
  EMPTY_LEADERBOARD_TABLE: {
    area: 'ui',
    action: 'leaderboard-normalize + tool-backed standings fast path.',
  },
  MISSING_SCOUT_UI: {
    area: 'mcp-local',
    action: 'Extend the player_scout local-data manifest and strengths_gaps renderer.',
  },
  NARRATIVE_FALSE_UNAVAILABLE: {
    area: 'agent',
    action: 'Prompt: partial scorecard ≠ missing career stats; use hydration.',
  },
  FAST_PATH_ERROR: {
    area: 'mcp-local',
    action: 'Fix DB connectivity, tool schemas, or missing league/season params.',
  },
  AI_WHEN_FAST_POSSIBLE: {
    area: 'router',
    action: 'Resolve season_id in router or preflight resolve_season tool.',
  },
  UNSUPPORTED_COMPONENT: {
    area: 'ui',
    action: 'Implement renderer or map error_card → insight_card.',
  },
};
