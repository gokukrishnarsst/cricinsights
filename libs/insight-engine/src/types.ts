/**
 * Supported insight-engine background job identifiers.
 */
export type JobName =
  | 'refresh-views'
  | 'head-to-head'
  | 'player-matchups'
  | 'leaderboards'
  | 'match-preview'
  | 'all';

export const JOB_NAMES: readonly JobName[] = [
  'refresh-views',
  'head-to-head',
  'player-matchups',
  'leaderboards',
  'match-preview',
  'all',
] as const;

export const RUN_ALL_JOB_SEQUENCE: readonly Exclude<JobName, 'all'>[] = [
  'refresh-views',
  'head-to-head',
  'player-matchups',
  'leaderboards',
  'match-preview',
] as const;

/**
 * Result payload returned by every background job.
 */
export interface JobResult {
  job_name: string;
  rows_affected: number;
  duration_ms: number;
  success: boolean;
  error?: string;
}
