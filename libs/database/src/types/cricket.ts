/** SportMonks entity identifier used in master.* and matches.* FK columns. */
export type SportmonksId = number;

export interface Player {
  sportmonksId: SportmonksId;
  uuid: string;
  firstname: string | null;
  lastname: string | null;
  fullname: string;
  countryId: SportmonksId | null;
  positionId: SportmonksId | null;
  imagePath: string | null;
  dateofbirth: string | null;
  gender: string | null;
  battingstyle: string | null;
  bowlingstyle: string | null;
  isActive: boolean;
}

export interface Team {
  sportmonksId: SportmonksId;
  uuid: string;
  name: string;
  code: string | null;
  countryId: SportmonksId | null;
  imagePath: string | null;
  nationalTeam: boolean;
  isActive: boolean;
}

export interface SquadMember {
  teamId: SportmonksId;
  playerId: SportmonksId;
  seasonId: SportmonksId;
  player: Player;
}

export interface TeamFormResult {
  fixtureId: SportmonksId;
  startingAt: string | null;
  opponentId: SportmonksId;
  opponentName: string;
  result: 'win' | 'loss' | 'draw' | 'no_result' | 'unknown';
  margin: string | null;
}

export interface LeagueRef {
  sportmonksId: SportmonksId;
  name: string;
  code: string | null;
}

export interface SeasonRef {
  sportmonksId: SportmonksId;
  name: string;
  code: string | null;
  leagueId: SportmonksId;
}

export interface Fixture {
  sportmonksId: SportmonksId;
  uuid: string;
  leagueId: SportmonksId;
  seasonId: SportmonksId;
  stageId: SportmonksId | null;
  round: string | null;
  localteamId: SportmonksId;
  visitorteamId: SportmonksId;
  localteamName: string | null;
  visitorteamName: string | null;
  startingAt: string | null;
  matchFormat: string | null;
  isLive: boolean;
  status: string | null;
  venueId: SportmonksId | null;
  winnerTeamId: SportmonksId | null;
  tossWonTeamId: SportmonksId | null;
  note: string | null;
}

export interface FixtureQueryOptions {
  seasonId?: SportmonksId;
  leagueId?: SportmonksId;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface Standing {
  teamId: SportmonksId;
  teamName: string;
  teamCode: string | null;
  leagueId: SportmonksId;
  seasonId: SportmonksId;
  stageId: SportmonksId;
  position: number | null;
  points: number | null;
  played: number | null;
  won: number | null;
  lost: number | null;
  draw: number | null;
  noresult: number | null;
  netRunRate: number | null;
  recentForm: string[] | null;
}

export type LeaderboardMetric =
  | 'batting_runs'
  | 'batting_wickets'
  | 'bowling_wickets'
  | 'strike_rate'
  | 'economy_rate'
  | 'net_run_rate';

export interface LeaderboardEntry {
  rank: number;
  playerId?: SportmonksId;
  playerName?: string;
  teamId?: SportmonksId;
  teamName?: string;
  metric: LeaderboardMetric;
  value: number;
  formatType?: string;
}

export interface CareerStats {
  playerId: SportmonksId;
  seasonId: SportmonksId;
  seasonName: string;
  leagueId: SportmonksId;
  leagueName: string;
  formatType: string;
  battingMatches: number | null;
  battingInnings: number | null;
  battingRuns: number | null;
  battingAverage: number | null;
  battingStrikeRate: number | null;
  battingFours: number | null;
  battingSixes: number | null;
  battingFifties: number | null;
  battingHundreds: number | null;
  bowlingMatches: number | null;
  bowlingOvers: number | null;
  bowlingWickets: number | null;
  bowlingAverage: number | null;
  bowlingEconomyRate: number | null;
  bowlingStrikeRate: number | null;
}

export interface BattingEntry {
  sportmonksId: SportmonksId;
  fixtureId: SportmonksId;
  teamId: SportmonksId;
  playerId: SportmonksId;
  playerName: string | null;
  scoreboard: string | null;
  runsScored: number | null;
  ballsFaced: number | null;
  fours: number;
  sixes: number;
  strikeRate: number | null;
  fowScore: number | null;
  fowBalls: number | null;
  isActive: boolean;
}

export interface BowlingEntry {
  sportmonksId: SportmonksId;
  fixtureId: SportmonksId;
  teamId: SportmonksId;
  playerId: SportmonksId;
  playerName: string | null;
  scoreboard: string | null;
  overs: number | null;
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noballs: number;
  economyRate: number | null;
  isActive: boolean;
}

export interface Ball {
  sportmonksId: SportmonksId;
  fixtureId: SportmonksId;
  teamId: SportmonksId;
  ballNumber: number;
  scoreboard: string | null;
  batsmanStrikerId: SportmonksId | null;
  batsmanNonStrikerId: SportmonksId | null;
  batsmanScorerId: SportmonksId | null;
  bowlerId: SportmonksId | null;
  batsmanOutId: SportmonksId | null;
  scoreOutcomeId: SportmonksId | null;
  scoreOutcomeName: string | null;
  scoreOutcomeRuns: number | null;
}

export interface MatchupStats {
  batsmanId: SportmonksId;
  bowlerId: SportmonksId;
  leagueId: SportmonksId | null;
  ballsFaced: number;
  runsScored: number;
  dismissals: number;
  fours: number;
  sixes: number;
  strikeRate: number | null;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function toInt(value: unknown): number | null {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
}

export function toString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function toBool(value: unknown): boolean {
  return value === true || value === 't';
}
