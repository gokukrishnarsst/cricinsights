import type { UIComponent } from '@/lib/template-engine';
import { normalizeStatsTableData } from '@/lib/stats-table-normalize';
import {
  coalesceLeaderboardRows,
  normalizeLeaderboardTableData,
} from '@/lib/leaderboard-normalize';
import {
  buildDismissalStatsTables,
  dismissalHasRows,
  dismissalNarrative,
  statsTableNeedsDismissalHydration,
} from '@/lib/dismissal-table';
import {
  buildPlayerScoutManifest,
  buildScoutIntelligence,
} from '@/lib/player-scout';

export interface ToolCallLike {
  toolName: string;
  output?: Record<string, unknown>;
  error?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapToolData(output: Record<string, unknown>): Record<string, unknown> {
  return asRecord(output.data) ?? output;
}

function collectScoutSources(toolCalls: ToolCallLike[]): {
  stats: Record<string, unknown> | null;
  dismissal: Record<string, unknown> | null;
  dismissals: Record<string, unknown>[];
  careerStats: unknown[] | null;
  remoteBattingByFormat: Array<{
    format: string;
    batting: Record<string, unknown>;
    profile: Record<string, unknown>;
  }>;
} {
  let stats: Record<string, unknown> | null = null;
  let dismissal: Record<string, unknown> | null = null;
  const dismissals: Record<string, unknown>[] = [];
  let careerStats: unknown[] | null = null;
  const remoteBattingByFormat: Array<{
    format: string;
    batting: Record<string, unknown>;
    profile: Record<string, unknown>;
  }> = [];

  for (const call of toolCalls) {
    if (call.error || !call.output) continue;
    const out = call.output;

    if (
      call.toolName === 'get_player_stats' ||
      call.toolName === 'get_player_stats_by_name'
    ) {
      if (call.toolName === 'get_player_stats') {
        stats = out;
        const inner = unwrapToolData(out);
        if (Array.isArray(inner.careerStats)) {
          careerStats = inner.careerStats;
        }
      } else {
        const profile = asRecord(out.profile);
        const batting = asRecord(out.batting);
        if (profile && batting) {
          const scope = asRecord(batting.scope);
          const format = String(
            scope?.format ?? scope?.leagueName ?? 'career',
          );
          remoteBattingByFormat.push({ format, batting, profile });
          stats = {
            data: {
              profile,
              highlights: {
                totalBattingRuns: batting.runs,
                totalBowlingWickets: asRecord(out.bowling)?.wickets ?? 0,
                seasonsTracked: 0,
              },
              careerStats: [],
            },
          };
        }
      }
    }

    if (call.toolName === 'get_player_career') {
      const rows = out.seasons ?? out.career ?? out.rows;
      if (Array.isArray(rows)) careerStats = rows;
    }

    if (call.toolName === 'player_dismissal_analysis') {
      dismissals.push(out);
      if (!dismissal || dismissalHasRows(out)) {
        dismissal = out;
      }
    }
  }

  return { stats, dismissal, dismissals, careerStats, remoteBattingByFormat };
}

function leagueRowsFromToolCalls(
  toolCalls: ToolCallLike[],
): Record<string, unknown> | null {
  for (const call of toolCalls) {
    if (call.error || !call.output) continue;
    if (call.toolName !== 'get_league_data') continue;
    const out = call.output;
    const data = unwrapToolData(out);
    const rows = coalesceLeaderboardRows(data);
    if (rows.length) {
      return normalizeLeaderboardTableData({
        title: data.title ?? 'League table',
        rows,
        metric: data.metric,
      });
    }
  }
  return null;
}

function buildPlayerCardFromRemote(
  output: Record<string, unknown>,
): Record<string, unknown> | null {
  const profile = asRecord(output.profile);
  const batting = asRecord(output.batting);
  if (!profile || !batting) return null;
  const bowling = asRecord(output.bowling);
  return {
    profile,
    highlights: {
      totalBattingRuns: batting.runs ?? 0,
      totalBowlingWickets: bowling?.wickets ?? 0,
      seasonsTracked: 0,
    },
    careerStats: [],
  };
}

function highlightsEmpty(data: Record<string, unknown>): boolean {
  const h = asRecord(data.highlights);
  if (!h) return true;
  return (
    (h.totalBattingRuns === undefined ||
      h.totalBattingRuns === 0 ||
      h.totalBattingRuns === null) &&
    (h.seasonsTracked === undefined || h.seasonsTracked === 0)
  );
}

function mergeStatsFromRemoteByName(
  cardData: Record<string, unknown>,
  batting: Record<string, unknown>,
  bowling: Record<string, unknown> | null,
  profile: Record<string, unknown>,
): void {
  cardData.profile = { ...(asRecord(cardData.profile) ?? {}), ...profile };
  cardData.highlights = {
    totalBattingRuns: batting.runs ?? 0,
    totalBowlingWickets: bowling?.wickets ?? 0,
    seasonsTracked: asRecord(cardData.highlights)?.seasonsTracked ?? 0,
  };
}

function comparisonEntityLabel(entity: unknown): string {
  const rec = asRecord(entity);
  if (!rec) return '';
  const profile = asRecord(rec.profile) ?? rec;
  const name =
    profile.fullname ??
    profile.name ??
    [profile.firstname, profile.lastname].filter(Boolean).join(' ');
  return typeof name === 'string' ? name.trim() : '';
}

/** Drop empty / Unknown vs Unknown duels the model invents for format compares. */
export function isValidComparisonCardData(data: Record<string, unknown>): boolean {
  const nameA = comparisonEntityLabel(data.entityA ?? data.playerA ?? data.a);
  const nameB = comparisonEntityLabel(data.entityB ?? data.playerB ?? data.b);
  if (!nameA || !nameB) return false;
  if (/^unknown$/i.test(nameA) || /^unknown$/i.test(nameB)) return false;
  // Format labels are not players — IPL vs ODI must not become a duel card.
  const formatLike =
    /^(ipl|odi|t20i?|tests?|bbl|the hundred)$/i;
  if (formatLike.test(nameA) || formatLike.test(nameB)) return false;
  return true;
}

/** Enrich AI manifests using executed tool payloads (player card zeros, missing scout UI). */
export function hydrateManifestFromToolCalls(
  components: UIComponent[],
  narrative: string,
  toolCalls: ToolCallLike[],
): { components: UIComponent[]; narrative: string } {
  if (!toolCalls.length) {
    return { components, narrative };
  }

  const sources = collectScoutSources(toolCalls);
  let next = [...components];

  const leagueTable = leagueRowsFromToolCalls(toolCalls);
  if (leagueTable) {
    const lbIdx = next.findIndex((c) => c.type === 'leaderboard_table');
    if (lbIdx >= 0) {
      next[lbIdx] = {
        ...next[lbIdx],
        data: normalizeLeaderboardTableData({
          ...(next[lbIdx].data ?? {}),
          ...leagueTable,
        }),
      };
    } else {
      next.push({ type: 'leaderboard_table', data: leagueTable });
    }
  }

  const hasStrengths = next.some((c) => c.type === 'strengths_gaps');
  let playerIdx = next.findIndex((c) => c.type === 'player_card');

  if (playerIdx < 0) {
    for (const call of toolCalls) {
      if (call.toolName !== 'get_player_stats_by_name' || !call.output) continue;
      const cardData = buildPlayerCardFromRemote(call.output);
      if (cardData) {
        next.unshift({ type: 'player_card', data: cardData });
        playerIdx = 0;
        break;
      }
    }
  }

  if (playerIdx >= 0 && sources.stats) {
    const card = next[playerIdx];
    const data = { ...(card.data ?? {}) };
    const inner = unwrapToolData(sources.stats);

    if (highlightsEmpty(data)) {
      if (sources.stats.data) {
        data.profile = inner.profile ?? data.profile;
        data.highlights = inner.highlights ?? data.highlights;
        data.careerStats = inner.careerStats ?? data.careerStats;
      }
    }

    if (sources.careerStats?.length) {
      data.careerStats = sources.careerStats;
      const highlights = asRecord(data.highlights) ?? {};
      if (!highlights.seasonsTracked) {
        data.highlights = {
          ...highlights,
          seasonsTracked: sources.careerStats.length,
        };
      }
    }

    next[playerIdx] = { ...card, data };
  }

  for (const call of toolCalls) {
    if (call.toolName !== 'get_player_stats_by_name' || !call.output) continue;
    const out = call.output;
    const batting = asRecord(out.batting);
    const profile = asRecord(out.profile);
    if (!batting || !profile) continue;

    if (playerIdx >= 0) {
      const card = next[playerIdx];
      const data = { ...(card.data ?? {}) };
      const existingRuns = Number(
        asRecord(data.highlights)?.totalBattingRuns ?? 0,
      );
      const nextRuns = Number(batting.runs ?? 0);
      // Prefer the richer batting aggregate when multiple formats were fetched.
      if (nextRuns >= existingRuns) {
        mergeStatsFromRemoteByName(
          data,
          batting,
          asRecord(out.bowling),
          profile,
        );
        next[playerIdx] = { ...card, data };
      }
    }
  }

  const statsTableIdx = next.findIndex((c) => c.type === 'stats_table');
  const career =
    sources.careerStats ??
    (playerIdx >= 0 && Array.isArray(next[playerIdx].data?.careerStats)
      ? (next[playerIdx].data.careerStats as unknown[])
      : null);

  const dismissalToolUsed = sources.dismissals.length > 0;
  const hasBrokenDismissalTables =
    dismissalToolUsed &&
    (next.some(
      (c) =>
        c.type === 'stats_table' &&
        statsTableNeedsDismissalHydration(c.data ?? {}),
    ) ||
      components.some(
        (c) =>
          c.type === 'stats_table' &&
          statsTableNeedsDismissalHydration(c.data ?? {}),
      ));

  // Career rows must not overwrite dismissal breakdown tables.
  if (
    career?.length &&
    statsTableIdx >= 0 &&
    !hasBrokenDismissalTables &&
    !statsTableNeedsDismissalHydration(next[statsTableIdx].data ?? {})
  ) {
    const table = next[statsTableIdx];
    next[statsTableIdx] = {
      ...table,
      data: normalizeStatsTableData({
        ...(table.data ?? {}),
        rows: career,
      }),
    };
  }

  if (sources.dismissals.length) {
    const built = sources.dismissals.flatMap((d) =>
      buildDismissalStatsTables(d),
    );
    if (built.length) {
      const keep = next.filter((c) => {
        if (c.type !== 'stats_table') return true;
        const title = String(c.data?.title ?? '').toLowerCase();
        if (/dismissal|by phase|bowler type|bowling style/.test(title)) {
          return false;
        }
        return !statsTableNeedsDismissalHydration(c.data ?? {});
      });
      const alreadyHasDismissal = keep.some(
        (c) =>
          c.type === 'stats_table' &&
          Array.isArray(c.data?.rows) &&
          (c.data.rows as unknown[]).length > 0 &&
          String(c.data?.title ?? '')
            .toLowerCase()
            .includes('dismissal'),
      );
      if (!alreadyHasDismissal || hasBrokenDismissalTables) {
        next = [...keep, ...built];
      }
    }

    // Honest coverage-gap cards: batting exists but dismissal rows do not.
    for (const bat of sources.remoteBattingByFormat) {
      const runs = Number(bat.batting.runs ?? 0);
      if (!runs) continue;
      const formatKey = bat.format.toUpperCase();
      const emptyForFormat = sources.dismissals.some((d) => {
        if (dismissalHasRows(d)) return false;
        const scope = asRecord(d.scope);
        const f = String(scope?.format ?? '').toUpperCase();
        const league = String(scope?.leagueName ?? '').toUpperCase();
        return (
          f === formatKey ||
          (formatKey === 'ODI' && f === 'ODI') ||
          (formatKey.includes('IPL') && /PREMIER|IPL/.test(league))
        );
      });
      if (!emptyForFormat) continue;
      const title = `${bat.format} dismissal coverage gap`;
      if (
        next.some(
          (c) =>
            c.type === 'insight_card' &&
            String(c.data?.title ?? '').toLowerCase() === title.toLowerCase(),
        )
      ) {
        continue;
      }
      next.push({
        type: 'insight_card',
        data: {
          title,
          severity: 'warning',
          content: `${String(bat.profile.fullname ?? 'Player')} has ${runs.toLocaleString()} ${bat.format} runs (${bat.batting.innings ?? '—'} inns, avg ${bat.batting.average ?? '—'}, SR ${bat.batting.strikeRate ?? '—'}), but ball-by-ball dismissal detail is not ingested for this format — so type / phase / bowler-style analysis cannot be compared here.`,
        },
      });
    }
  }

  const shouldAddScout =
    !hasStrengths &&
    (sources.stats || sources.dismissal) &&
    /\b(strength|weakness|scout)\b/i.test(narrative);

  const statsInner = sources.stats
    ? unwrapToolData(sources.stats)
    : null;
  const highlightRuns = Number(
    asRecord(statsInner?.highlights)?.totalBattingRuns ?? 0,
  );
  const meaningfulScout =
    highlightRuns > 0 ||
    (sources.dismissal !== null && dismissalHasRows(sources.dismissal));

  if (shouldAddScout && sources.stats && meaningfulScout) {
    const scout = buildPlayerScoutManifest({
      data: {
        stats: sources.stats,
        dismissal: sources.dismissal,
        filters: { leagueId: 1 },
      },
    });
    if (!hasStrengths) {
      next.push(
        scout.components.find((c) => c.type === 'strengths_gaps')!,
      );
    }
  } else if (
    !hasStrengths &&
    sources.stats &&
    sources.dismissal &&
    playerIdx >= 0 &&
    meaningfulScout
  ) {
    const intelligence = buildScoutIntelligence({
      stats: sources.stats,
      dismissal: sources.dismissal,
      filters: { leagueId: 1 },
    });
    next.push({
      type: 'strengths_gaps',
      data: { intelligence },
    });
  }

  // Drop hollow scout panels the model invented (0 runs / empty lists).
  next = next.filter((c) => {
    if (c.type !== 'strengths_gaps') return true;
    if (!meaningfulScout) return false;
    const intel = asRecord(c.data?.intelligence) ?? asRecord(c.data);
    const strengths = Array.isArray(intel?.strengths) ? intel!.strengths : [];
    const gaps = Array.isArray(intel?.gaps) ? intel!.gaps : [];
    if (strengths.length === 0 && gaps.length === 0) return false;
    return true;
  });

  // Drop bogus Player Duel cards (Unknown vs Unknown, or format-vs-format).
  next = next.filter((c) => {
    if (c.type !== 'comparison_card') return true;
    // Format dismissal compares never need a player duel.
    if (sources.dismissals.length > 0) return false;
    return isValidComparisonCardData(c.data ?? {});
  });

  let nextNarrative = narrative;
  const bestDismissal =
    sources.dismissals.find((d) => dismissalHasRows(d)) ?? sources.dismissal;
  const falseUnavailable =
    /no dismissal data|not available|cannot be provided|currently unavailable|incomplete or not yet ingested/i.test(
      narrative,
    );

  if (bestDismissal && dismissalHasRows(bestDismissal) && falseUnavailable) {
    const gapNote =
      sources.remoteBattingByFormat.length > 0
        ? ' Where another format lacks dismissal rows but has batting aggregates, that is a coverage gap — not missing career stats.'
        : '';
    nextNarrative = `${dismissalNarrative(bestDismissal)}${gapNote}`;
  } else if (sources.dismissal && hasBrokenDismissalTables) {
    nextNarrative = dismissalNarrative(sources.dismissal);
  } else if (
    /unavailable|incomplete scorecard/i.test(narrative) &&
    sources.stats
  ) {
    const inner = unwrapToolData(sources.stats);
    const highlights = asRecord(inner.highlights);
    const runs = highlights?.totalBattingRuns;
    if (runs && Number(runs) > 0) {
      nextNarrative = narrative.replace(
        /currently unavailable[^.]*\./i,
        `show ${Number(runs).toLocaleString()} career runs in our database; dismissal insights use a partial scorecard sample.`,
      );
    }
  }

  return { components: next, narrative: nextNarrative };
}
