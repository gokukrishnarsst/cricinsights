export {
  DEFAULT_DATABASE_USER,
  DATABASE_NAME,
  databaseNameForEnv,
  databaseUrlFromEnv,
  readDatabaseUrlFromEnv,
  redactDatabaseUrl,
} from './env.js';
export { getPool, getReadPool, closePool } from './client.js';
export {
  ensureChatSession,
  logChatMessage,
  logChatMessageSafe,
  recordChatMessageSafe,
} from './chat.js';
export type {
  ChatMessageRole,
  LogChatMessageInput,
  RecordChatMessageInput,
} from './chat.js';
export {
  addToWaitlist,
  isValidEmail,
  normalizeEmail,
  WaitlistDuplicateError,
  WaitlistInvalidEmailError,
} from './waitlist.js';

export type {
  Ball,
  BattingEntry,
  BowlingEntry,
  CareerStats,
  Fixture,
  FixtureQueryOptions,
  LeaderboardEntry,
  LeaderboardMetric,
  LeagueRef,
  MatchupStats,
  Player,
  SeasonRef,
  SportmonksId,
  SquadMember,
  Standing,
  Team,
  TeamFormResult,
} from './types/cricket.js';

export {
  searchPlayers,
  resolvePlayerByName,
  getPlayerById,
  getPlayerCareerStats,
} from './queries/players.js';
export {
  getTeamById,
  getTeamSquad,
  getTeamRecentForm,
  searchTeams,
  resolveTeamByName,
} from './queries/teams.js';
export { resolveSeasonForLeague } from './queries/seasons.js';
export {
  getFixtureById,
  getFixturesByTeam,
  getFixturesByLeague,
  getSeasonWinner,
  getHeadToHead,
  findFixturesByTeams,
  type FixtureContextQueryOptions,
} from './queries/fixtures.js';
export { getStandings, getLeaderboard } from './queries/standings.js';
export {
  getFixtureBatting,
  getPlayerBattingHistory,
} from './queries/batting.js';
export {
  getFixtureBowling,
  getPlayerBowlingHistory,
} from './queries/bowling.js';
export {
  getFixtureScorecard,
  type FixtureScorecard,
  type InningsRun,
  type ScorecardInning,
} from './queries/scorecards.js';
export { getFixtureBalls, getPlayerMatchup } from './queries/balls.js';
export {
  searchCricketEntities,
  getPlayerMatchHistory,
  getMatchContext,
  getBallAnalysis,
  getTeamAnalytics,
  getVenueStats,
  getRankings,
  getTrends,
  getLiveMatchState,
} from './queries/analytics.js';
