export type LeagueCode = "IPL" | "The Hundred";

export type PlayerRole =
  | "batter"
  | "bowler"
  | "all-rounder"
  | "wicketkeeper";

export type CardTier = "bronze" | "silver" | "gold" | "totw" | "toty" | "icon";

export type StatKey =
  | "bat"
  | "con"
  | "pwr"
  | "dth"
  | "eco"
  | "wkt"
  | "clt";

export interface CricketStats {
  bat: number;
  con: number;
  pwr: number;
  dth: number;
  eco: number;
  wkt: number;
  clt: number;
}

export interface PlayerSummary {
  id: number;
  fullname: string;
  role: PlayerRole;
  team?: string;
  teamLogoUrl?: string;
  league?: LeagueCode;
  battingStyle?: string;
  bowlingStyle?: string;
  avatarUrl: string;
}

export interface PlayerProfile extends PlayerSummary {
  country?: string;
  position?: string;
}

export interface PlayerAggregates {
  matches: number;
  runs: number;
  balls: number;
  strikeRate: number;
  average: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs: number;
  economy: number;
  bowlingAverage: number;
  powerplayRuns: number;
  powerplayBalls: number;
  deathRuns: number;
  deathBalls: number;
  middleRuns: number;
  middleBalls: number;
}

export interface RatedPlayerCard {
  player: PlayerProfile;
  overall: number;
  tier: CardTier;
  archetype: string;
  stats: CricketStats;
  aggregates: PlayerAggregates;
}

export interface ComparisonRow {
  key: StatKey;
  label: string;
  playerA: number;
  playerB: number;
  winner: "a" | "b" | null;
}

export interface PlayerComparison {
  playerA: RatedPlayerCard;
  playerB: RatedPlayerCard;
  matchupType: string;
  insight: string;
  rows: ComparisonRow[];
  emphasis: StatKey[];
}

export interface IntelligenceItem {
  key: StatKey;
  label: string;
  rating: number;
  evidence: string;
  modelled: boolean;
}

export interface PhaseImpact {
  phase: "Powerplay" | "Middle" | "Death";
  strikeRate: number;
  runShare: number;
  modelled: boolean;
}

export interface BenchmarkRow {
  metric: string;
  value: number;
  percentile: number | null;
  higherIsBetter: boolean;
}

export interface PlayerIntelligence {
  card: RatedPlayerCard;
  role: PlayerRole;
  strengths: IntelligenceItem[];
  gaps: IntelligenceItem[];
  phases: PhaseImpact[];
  benchmarks: BenchmarkRow[];
  benchmarkScope: string;
  form: { index: number; consistency: number; note: string };
  summary: string;
}

import type { FormatStats } from "@architecture/db/seed/types";

export interface PlayerCareerReport {
  player: PlayerProfile;
  formatStats: FormatStats;
  coachStrengths: { label: string; evidence: string }[];
  coachGaps: { label: string; evidence: string }[];
  bioSummary: string;
  leagues: LeagueCode[];
}

export interface LeagueMetric {
  label: string;
  ipl: number;
  hundred: number;
  unit?: string;
}

export interface LeagueComparisonResult {
  metrics: LeagueMetric[];
  summary: string;
}
