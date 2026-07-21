/** UI manifest returned by POST /api/chat (see also @/types/generative-ui for rich UI shapes). */
export interface UIManifest {
  components: UIComponent[];
  narrative: string;
  shareable?: boolean;
}

export interface UIComponent {
  type: string;
  data: Record<string, unknown>;
}

export type ComponentType =
  | 'player_card'
  | 'comparison_card'
  | 'stats_table'
  | 'trend_chart'
  | 'scorecard_view'
  | 'leaderboard_table'
  | 'match_preview_card'
  | 'matchup_card'
  | 'social_share_card'
  | 'narrative_block'
  | 'h2h_stats_table';

export interface PlayerProfile {
  sportmonksId?: number;
  fullname?: string;
  firstname?: string | null;
  lastname?: string | null;
  imagePath?: string | null;
  countryId?: number | null;
  country?: string | null;
  positionId?: number | null;
  position?: string | null;
  battingstyle?: string | null;
  bowlingstyle?: string | null;
  dateofbirth?: string | null;
  gender?: string | null;
}

export interface PlayerHighlights {
  totalBattingRuns?: number;
  totalBowlingWickets?: number;
  seasonsTracked?: number;
}

export interface PlayerCardData {
  profile?: PlayerProfile;
  highlights?: PlayerHighlights;
  careerStats?: CareerStatsRow[];
}

export interface CareerStatsRow {
  playerId?: number;
  seasonId?: number;
  seasonName?: string;
  leagueId?: number;
  leagueName?: string;
  formatType?: string;
  battingMatches?: number | null;
  battingInnings?: number | null;
  battingRuns?: number | null;
  battingAverage?: number | null;
  battingStrikeRate?: number | null;
  battingFours?: number | null;
  battingSixes?: number | null;
  battingFifties?: number | null;
  battingHundreds?: number | null;
  bowlingMatches?: number | null;
  bowlingOvers?: number | null;
  bowlingWickets?: number | null;
  bowlingAverage?: number | null;
  bowlingEconomyRate?: number | null;
  bowlingStrikeRate?: number | null;
  [key: string]: unknown;
}

export interface DiffHighlight {
  a?: number;
  b?: number;
  delta?: number;
  leader?: 'a' | 'b' | 'tie' | string;
  value?: number;
}

export interface ComparisonEntity {
  profile?: PlayerProfile | TeamProfile;
  careerStats?: CareerStatsRow[];
  name?: string;
}

export interface TeamProfile {
  sportmonksId?: number;
  name?: string;
  code?: string | null;
  imagePath?: string | null;
  countryId?: number | null;
}

export interface ComparisonMetric {
  label: string;
  a?: number | string | null;
  b?: number | string | null;
  unit?: string;
}

import type { EnrichedPlayerComparison } from '@/lib/player-compare';

export interface ComparisonCardData {
  comparisonType?: string;
  entityA?: ComparisonEntity;
  entityB?: ComparisonEntity;
  metrics?: ComparisonMetric[];
  diff?: Record<string, DiffHighlight>;
  headToHead?: unknown[];
  enriched?: EnrichedPlayerComparison;
}

export interface StatsTableData {
  title?: string;
  rows?: CareerStatsRow[] | Record<string, unknown>[];
  filters?: Record<string, unknown>;
  columns?: StatsColumn[];
}

export interface StatsColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'number' | 'decimal' | 'text';
}

export interface TrendSeriesPoint {
  season?: string;
  seasonName?: string;
  label?: string;
  value?: number;
  runs?: number;
  wickets?: number;
  [key: string]: unknown;
}

export interface TrendChartData {
  title?: string;
  series?: TrendSeriesPoint[];
  xKey?: string;
  yKeys?: string[];
  labels?: Record<string, string>;
}

export interface BattingEntry {
  playerId?: number;
  playerName?: string | null;
  teamId?: number;
  scoreboard?: string | null;
  runsScored?: number | null;
  ballsFaced?: number | null;
  fours?: number;
  sixes?: number;
  strikeRate?: number | null;
}

export interface BowlingEntry {
  playerId?: number;
  playerName?: string | null;
  teamId?: number;
  scoreboard?: string | null;
  overs?: number | null;
  maidens?: number;
  runsConceded?: number;
  wickets?: number;
  economyRate?: number | null;
}

export interface InningsRun {
  teamId?: number;
  inning?: number;
  score?: number | null;
  wickets?: number | null;
  overs?: number | null;
}

export interface FixtureSummary {
  sportmonksId?: number;
  localteamName?: string | null;
  visitorteamName?: string | null;
  localteamId?: number;
  visitorteamId?: number;
  startingAt?: string | null;
  status?: string | null;
  matchFormat?: string | null;
  venueId?: number | null;
  winnerTeamId?: number | null;
}

export interface ScorecardViewData {
  fixture?: FixtureSummary;
  match?: {
    fixture?: FixtureSummary;
    scorecard?: {
      batting?: BattingEntry[];
      bowling?: BowlingEntry[];
      innings?: ScorecardInning[];
    };
    inningsRuns?: InningsRun[];
  };
  scorecard?: {
    batting?: BattingEntry[];
    bowling?: BowlingEntry[];
    innings?: ScorecardInning[];
  };
  inningsRuns?: InningsRun[];
}

export interface ScorecardInning extends InningsRun {
  battingTeamName?: string;
  bowlingTeamId?: number | null;
  bowlingTeamName?: string | null;
  batting?: BattingEntry[];
  bowling?: BowlingEntry[];
}

export interface LeaderboardRow {
  rank?: number;
  position?: number | null;
  playerId?: number;
  playerName?: string;
  teamId?: number;
  teamName?: string;
  teamCode?: string | null;
  value?: number;
  points?: number | null;
  played?: number | null;
  won?: number | null;
  lost?: number | null;
  netRunRate?: number | null;
  metric?: string;
  [key: string]: unknown;
}

export interface LeaderboardTableData {
  title?: string;
  rows?: LeaderboardRow[];
  standings?: LeaderboardRow[];
  entries?: LeaderboardRow[];
  leaderboard?: LeaderboardRow[];
  metric?: string | null;
}

export interface TeamFormEntry {
  result?: string;
  opponentName?: string;
  margin?: string | null;
}

export interface MatchPreviewCardData {
  fixture?: FixtureSummary;
  localTeam?: TeamProfile;
  visitorTeam?: TeamProfile;
  venue?: string;
  localForm?: TeamFormEntry[];
  visitorForm?: TeamFormEntry[];
  headToHead?: { teamAWins?: number; teamBWins?: number; matches?: number };
  h2hSummary?: string;
}

export interface MatchupStats {
  ballsFaced?: number;
  runsScored?: number;
  dismissals?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number | null;
}

export interface MatchupCardData {
  comparisonType?: string;
  batsman?: { profile?: PlayerProfile };
  bowler?: { profile?: PlayerProfile };
  entityA?: ComparisonEntity;
  entityB?: ComparisonEntity;
  matchup?: MatchupStats;
  matchupStats?: MatchupStats;
  diff?: Record<string, DiffHighlight>;
}

export interface ShareButtonData {
  title?: string;
  text?: string;
  url?: string;
  manifest?: UIManifest;
}

export interface NarrativeBlockData {
  text?: string;
  narrative?: string;
}

export interface ComponentRendererProps {
  manifest?: UIManifest | null;
  loading?: boolean;
  className?: string;
  onShare?: (manifest: UIManifest) => void;
  /** When false (default for chat), narrative is omitted — the bubble already shows it. */
  showNarrative?: boolean;
}
