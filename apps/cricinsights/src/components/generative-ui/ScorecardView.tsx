'use client';

import type { BowlingEntry, ScorecardInning, ScorecardViewData } from './types';
import { CardHeader, GlassCard } from './primitives';
import { cn, formatDecimal, formatNumber, statNum } from './utils';

interface ScorecardViewProps {
  data: ScorecardViewData;
  className?: string;
}

export function ScorecardView({ data, className }: ScorecardViewProps) {
  const match = data.match ?? data;
  const fixture = match.fixture ?? data.fixture;
  const scorecard = match.scorecard ?? data.scorecard ?? {};
  const batting = scorecard.batting ?? [];
  const bowling = scorecard.bowling ?? [];
  const inningsRuns = match.inningsRuns ?? data.inningsRuns ?? [];
  const innings = scorecard.innings ?? groupLegacyScorecard(fixture, inningsRuns, batting, bowling);

  const title = fixture
    ? `${fixture.localteamName ?? 'Team A'} vs ${fixture.visitorteamName ?? 'Team B'}`
    : 'Match Scorecard';

  return (
    <GlassCard className={cn('p-4 sm:p-5', className)}>
      <CardHeader
        title={title}
        subtitle={
          fixture?.startingAt
            ? new Date(fixture.startingAt).toLocaleString()
            : fixture?.status ?? undefined
        }
      />

      {innings.map((inning, index) => (
        <InningsSection key={`${inning.teamId}-${inning.inning ?? index}`} inning={inning} index={index} />
      ))}
    </GlassCard>
  );
}

function InningsSection({ inning, index }: { inning: ScorecardInning; index: number }) {
  const scoreLine = inning.score === null || inning.score === undefined
    ? 'Score unavailable'
    : `${formatNumber(inning.score)}/${formatNumber(inning.wickets)} (${formatDecimal(inning.overs, 1)} ov)`;
  return (
    <section className="mt-5 border-t border-line pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">
          {inning.battingTeamName ?? `Innings ${inning.inning ?? index + 1}`}
        </h3>
        <span className={cn('text-sm font-semibold text-accent-2', statNum)}>{scoreLine}</span>
      </div>
      <Section title={`${inning.battingTeamName ?? 'Batting'} batting`}>
        <MiniTable
          headers={['Batter', 'R', 'B', '4s', '6s', 'SR']}
          rows={(inning.batting ?? []).map((b) => [
            b.playerName ?? '—',
            formatNumber(b.runsScored),
            formatNumber(b.ballsFaced),
            formatNumber(b.fours),
            formatNumber(b.sixes),
            formatDecimal(b.strikeRate),
          ])}
        />
      </Section>
      <Section title={`${inning.bowlingTeamName ?? 'Opposition'} bowling`}>
        <MiniTable
          headers={['Bowler', 'O', 'M', 'R', 'W', 'Econ']}
          rows={(inning.bowling ?? []).map((b: BowlingEntry) => [
            b.playerName ?? '—',
            formatDecimal(b.overs, 1),
            formatNumber(b.maidens),
            formatNumber(b.runsConceded),
            formatNumber(b.wickets),
            formatDecimal(b.economyRate),
          ])}
        />
      </Section>
    </section>
  );
}

function groupLegacyScorecard(
  fixture: ScorecardViewData['fixture'],
  inningsRuns: NonNullable<ScorecardViewData['inningsRuns']>,
  batting: NonNullable<ScorecardViewData['scorecard']>['batting'],
  bowling: NonNullable<ScorecardViewData['scorecard']>['bowling'],
): ScorecardInning[] {
  const teamIds = [...new Set([
    ...inningsRuns.map((entry) => entry.teamId),
    ...(batting ?? []).map((entry) => entry.teamId),
  ].filter((teamId): teamId is number => typeof teamId === 'number'))];
  return teamIds.map((teamId, index) => {
    const run = inningsRuns.find((entry) => entry.teamId === teamId);
    const bowlingTeamId = [fixture?.localteamId, fixture?.visitorteamId]
      .find((id) => typeof id === 'number' && id !== teamId) ?? null;
    const battingTeamName = teamId === fixture?.localteamId
      ? fixture.localteamName
      : teamId === fixture?.visitorteamId
        ? fixture.visitorteamName
        : `Team ${teamId}`;
    const bowlingTeamName = bowlingTeamId === fixture?.localteamId
      ? fixture.localteamName
      : bowlingTeamId === fixture?.visitorteamId
        ? fixture.visitorteamName
        : null;
    return {
      teamId,
      inning: run?.inning ?? index + 1,
      score: run?.score ?? null,
      wickets: run?.wickets ?? null,
      overs: run?.overs ?? null,
      battingTeamName: battingTeamName ?? `Team ${teamId}`,
      bowlingTeamId,
      bowlingTeamName,
      batting: (batting ?? []).filter((entry) => entry.teamId === teamId),
      bowling: (bowling ?? []).filter((entry) => entry.teamId === bowlingTeamId),
    };
  });
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-bold tracking-wider text-gold uppercase">
        {title}
      </h4>
      {children}
    </div>
  );
}

function MiniTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-mute">No data</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-line text-ink-mute">
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  'px-2 py-1.5 font-medium',
                  h === headers[0] ? 'text-left' : 'text-right',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-line/50 hover:bg-surface-2/60">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-2 py-1.5 text-ink-soft',
                    statNum,
                    ci === 0 ? 'text-left font-medium text-ink' : 'text-right',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
