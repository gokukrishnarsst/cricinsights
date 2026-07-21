import type { Pool } from 'pg';
import { computeHeadToHead } from './jobs/compute-head-to-head.js';
import { computeLeaderboards } from './jobs/compute-leaderboards.js';
import { computeMatchPreview } from './jobs/compute-match-preview.js';
import { computePlayerMatchups } from './jobs/compute-player-matchups.js';
import { log } from './jobs/job-utils.js';
import { refreshMaterializedViews } from './jobs/refresh-materialized-views.js';
import {
  JOB_NAMES,
  RUN_ALL_JOB_SEQUENCE,
  type JobName,
  type JobResult,
} from './types.js';

type RunnableJobName = Exclude<JobName, 'all'>;

/**
 * Orchestrates insight-engine background jobs against a shared Postgres pool.
 */
export class InsightEngine {
  constructor(private readonly pool: Pool) {}

  /**
   * Run all insight jobs sequentially in dependency-friendly order.
   */
  async runAll(): Promise<JobResult[]> {
    const results: JobResult[] = [];

    for (const jobName of RUN_ALL_JOB_SEQUENCE) {
      results.push(await this.runJob(jobName));
    }

    this.printSummary(results);
    return results;
  }

  /**
   * Run a single job by CLI-friendly name.
   */
  async runJob(jobName: RunnableJobName): Promise<JobResult> {
    const runner = this.getJobRunner(jobName);
    return runner(this.pool);
  }

  /**
   * Print a summary table of job results to stdout.
   */
  printSummary(results: JobResult[]): void {
    if (results.length === 0) {
      return;
    }

    const headers = ['Job', 'Success', 'Rows', 'Duration (ms)', 'Error'];
    const rows = results.map((result) => [
      result.job_name,
      result.success ? 'yes' : 'no',
      String(result.rows_affected),
      String(result.duration_ms),
      result.error ?? '',
    ]);

    const widths = headers.map((header, index) =>
      Math.max(header.length, ...rows.map((row) => row[index].length)),
    );

    const formatRow = (cells: string[]) =>
      cells.map((cell, index) => cell.padEnd(widths[index])).join('  ');

    log('Job summary');
    log(formatRow(headers));
    log(formatRow(widths.map((width) => '-'.repeat(width))));
    for (const row of rows) {
      log(formatRow(row));
    }
  }

  private getJobRunner(jobName: RunnableJobName) {
    switch (jobName) {
      case 'refresh-views':
        return refreshMaterializedViews;
      case 'head-to-head':
        return computeHeadToHead;
      case 'player-matchups':
        return computePlayerMatchups;
      case 'leaderboards':
        return computeLeaderboards;
      case 'match-preview':
        return computeMatchPreview;
      default: {
        const exhaustive: never = jobName;
        throw new Error(`Unsupported job: ${exhaustive}`);
      }
    }
  }
}

export { JOB_NAMES, RUN_ALL_JOB_SEQUENCE };
