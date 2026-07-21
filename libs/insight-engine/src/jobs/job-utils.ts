import type { Pool } from 'pg';
import type { JobResult } from '../types.js';

/**
 * Emit a timestamped log line to stdout.
 */
export function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Execute a job with timing, logging, and standardized error handling.
 */
export async function executeJob(
  jobName: string,
  pool: Pool,
  run: (pool: Pool) => Promise<number>,
): Promise<JobResult> {
  const started = Date.now();
  log(`Starting job: ${jobName}`);

  try {
    const rowsAffected = await run(pool);
    const duration_ms = Date.now() - started;
    log(`Finished job: ${jobName} (${rowsAffected} rows, ${duration_ms}ms)`);
    return {
      job_name: jobName,
      rows_affected: rowsAffected,
      duration_ms,
      success: true,
    };
  } catch (error) {
    const duration_ms = Date.now() - started;
    const message =
      error instanceof Error ? error.message : 'Unknown job execution error';
    log(`Failed job: ${jobName} — ${message}`);
    return {
      job_name: jobName,
      rows_affected: 0,
      duration_ms,
      success: false,
      error: message,
    };
  }
}
