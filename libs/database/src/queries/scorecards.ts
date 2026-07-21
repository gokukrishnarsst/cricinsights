import { getReadPool } from '../client.js';
import type { BattingEntry, BowlingEntry, Fixture, SportmonksId } from '../types/cricket.js';
import { getFixtureBatting } from './batting.js';
import { getFixtureBowling } from './bowling.js';
import { getFixtureById } from './fixtures.js';

export interface InningsRun {
  teamId: SportmonksId;
  inning: number | null;
  score: number | null;
  wickets: number | null;
  overs: number | null;
}

export interface ScorecardInning extends InningsRun {
  battingTeamName: string;
  bowlingTeamId: SportmonksId | null;
  bowlingTeamName: string | null;
  batting: BattingEntry[];
  bowling: BowlingEntry[];
}

export interface FixtureScorecard {
  fixture: Fixture;
  scorecard: {
    batting: BattingEntry[];
    bowling: BowlingEntry[];
    innings: ScorecardInning[];
  };
  inningsRuns: InningsRun[];
}

/**
 * Build a complete, team-aware scorecard. Raw batting and bowling rows retain
 * their source shape, while `scorecard.innings` is the canonical presentation
 * model: one batting innings plus the opposition bowling figures.
 */
export async function getFixtureScorecard(
  fixtureId: SportmonksId,
): Promise<FixtureScorecard | null> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return null;

  const [batting, bowling, inningsRuns] = await Promise.all([
    getFixtureBatting(fixtureId),
    getFixtureBowling(fixtureId),
    getFixtureInningsRuns(fixtureId),
  ]);

  return {
    fixture,
    scorecard: {
      batting,
      bowling,
      innings: buildScorecardInnings(fixture, inningsRuns, batting, bowling),
    },
    inningsRuns,
  };
}

async function getFixtureInningsRuns(fixtureId: SportmonksId): Promise<InningsRun[]> {
  const pool = await getReadPool();
  const { rows } = await pool.query<{
    team_id: string;
    inning: number | null;
    score: number | null;
    wickets: number | null;
    overs: string | null;
  }>(
    `SELECT team_id, inning, score, wickets, overs
     FROM matches.fixture_runs
     WHERE fixture_id = $1
     ORDER BY inning NULLS LAST, team_id`,
    [fixtureId],
  );

  return rows.map((row) => ({
    teamId: Number(row.team_id),
    inning: row.inning,
    score: row.score,
    wickets: row.wickets,
    overs: row.overs !== null ? Number(row.overs) : null,
  }));
}

function buildScorecardInnings(
  fixture: Fixture,
  inningsRuns: InningsRun[],
  batting: BattingEntry[],
  bowling: BowlingEntry[],
): ScorecardInning[] {
  const teamNames = new Map<SportmonksId, string>([
    [fixture.localteamId, fixture.localteamName ?? `Team ${fixture.localteamId}`],
    [fixture.visitorteamId, fixture.visitorteamName ?? `Team ${fixture.visitorteamId}`],
  ]);
  const knownTeamIds = [fixture.localteamId, fixture.visitorteamId];
  const innings = inningsRuns.length > 0
    ? inningsRuns
    : [...new Set(batting.map((entry) => entry.teamId))].map((teamId, index) => ({
        teamId,
        inning: index + 1,
        score: null,
        wickets: null,
        overs: null,
      }));

  return innings.map((run, index) => {
    const teamId = run.teamId;
    const bowlingTeamId = knownTeamIds.find((id) => id !== teamId) ?? null;
    const inningScoreboard = run.inning === null ? null : `S${run.inning}`;
    return {
      teamId,
      inning: run.inning ?? index + 1,
      score: run.score,
      wickets: run.wickets,
      overs: run.overs,
      battingTeamName: teamNames.get(teamId) ?? `Team ${teamId}`,
      bowlingTeamId,
      bowlingTeamName: bowlingTeamId === null
        ? null
        : teamNames.get(bowlingTeamId) ?? `Team ${bowlingTeamId}`,
      batting: selectInningRows(batting, teamId, inningScoreboard),
      bowling: bowlingTeamId === null
        ? []
        : selectInningRows(bowling, bowlingTeamId, inningScoreboard),
    };
  });
}

function selectInningRows<T extends { teamId: SportmonksId; scoreboard: string | null }>(
  rows: T[],
  teamId: SportmonksId,
  inningScoreboard: string | null,
): T[] {
  const forTeam = rows.filter((entry) => entry.teamId === teamId);
  if (!inningScoreboard) return forTeam;
  const exactInning = forTeam.filter(
    (entry) => entry.scoreboard?.trim().toUpperCase() === inningScoreboard,
  );
  // Older imports may not persist the S1/S2 marker. Team-only grouping is a
  // safe fallback for ordinary single-innings fixtures.
  return exactInning.length > 0 ? exactInning : forTeam;
}
