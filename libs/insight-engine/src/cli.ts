#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from '@cricket-ai/database';
import { InsightEngine } from './engine.js';
import { JOB_NAMES, type JobName } from './types.js';

type RunnableJobName = Exclude<JobName, 'all'>;

function parseJobArg(argv: string[]): JobName {
  const jobFlag = argv.find((arg) => arg.startsWith('--job='));
  const jobValue = jobFlag?.slice('--job='.length);

  if (!jobValue) {
    throw new Error(
      `Missing --job flag. Supported values: ${JOB_NAMES.join(', ')}`,
    );
  }

  if (!JOB_NAMES.includes(jobValue as JobName)) {
    throw new Error(
      `Unknown job "${jobValue}". Supported values: ${JOB_NAMES.join(', ')}`,
    );
  }

  return jobValue as JobName;
}

/**
 * CLI entry point for running insight-engine jobs.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const jobName = parseJobArg(argv);
  const pool = await getPool();
  const engine = new InsightEngine(pool);

  try {
    if (jobName === 'all') {
      const results = await engine.runAll();
      return results.some((result) => !result.success) ? 1 : 0;
    }

    const result = await engine.runJob(jobName as RunnableJobName);
    engine.printSummary([result]);
    return result.success ? 0 : 1;
  } finally {
    await closePool();
  }
}

const entryPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : '';
const isDirectRun = invokedPath === entryPath;

if (isDirectRun) {
  runCli()
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error('[insight-engine] Fatal error:', error);
      process.exit(1);
    });
}
