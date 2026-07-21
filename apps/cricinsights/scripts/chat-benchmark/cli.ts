#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHAT_BENCHMARK_QUESTIONS,
  type BenchmarkLevel,
  type ChatBenchmarkQuestion,
} from './questions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE_URL = process.env.CHAT_BENCHMARK_BASE_URL ?? 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 60_000;

interface BenchmarkResult extends ChatBenchmarkQuestion {
  status: number | null;
  route: string | null;
  intent: string | null;
  firstResponseMs: number | null;
  totalMs: number;
  toolCalls: number;
  passed: boolean;
  timedOut: boolean;
  answerPreview: string | null;
  error: string | null;
}

interface BenchmarkReport {
  startedAt: string;
  baseUrl: string;
  timeoutMs: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    timedOut: number;
    medianTotalMs: number | null;
    p95TotalMs: number | null;
    medianFirstResponseMs: number | null;
    routes: Record<string, number>;
    levels: Record<BenchmarkLevel, { total: number; passed: number; medianTotalMs: number | null }>;
  };
  results: BenchmarkResult[];
}

interface RunOptions {
  baseUrl: string;
  timeoutMs: number;
  levels: Set<BenchmarkLevel> | null;
  ids: Set<string> | null;
  outPath?: string;
  markdownOutPath?: string;
}

function parseArgs(argv: string[]): RunOptions {
  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const baseUrl = (valueAfter('--base-url') ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const timeoutValue = Number(valueAfter('--timeout-ms') ?? DEFAULT_TIMEOUT_MS);
  const selectedLevels = valueAfter('--levels')
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is BenchmarkLevel =>
      ['easy', 'moderate', 'hard', 'extreme'].includes(value),
    );
  const selectedIds = valueAfter('--id')
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    baseUrl,
    timeoutMs: Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : DEFAULT_TIMEOUT_MS,
    levels: selectedLevels?.length ? new Set(selectedLevels) : null,
    ids: selectedIds?.length ? new Set(selectedIds) : null,
    outPath: valueAfter('--out'),
    markdownOutPath: valueAfter('--markdown-out'),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function previewFromPayload(payload: Record<string, unknown>): string | null {
  const data = asRecord(payload.data);
  const narrative = data?.narrative ?? payload.narrative ?? payload.message;
  return typeof narrative === 'string' ? narrative.replace(/\s+/g, ' ').slice(0, 180) : null;
}

async function runQuestion(
  question: ChatBenchmarkQuestion,
  options: RunOptions,
): Promise<BenchmarkResult> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  let firstResponseMs: number | null = null;
  let route: string | null = null;
  let intent: string | null = null;
  let toolCalls = 0;
  let answerPreview: string | null = null;
  let error: string | null = null;
  let status: number | null = null;
  let completed = false;

  try {
    const response = await fetch(`${options.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: question.question }),
      signal: controller.signal,
    });
    status = response.status;
    firstResponseMs = performance.now() - startedAt;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/x-ndjson')) {
      const payload = asRecord(await response.json());
      route = typeof payload?.route === 'string' ? payload.route : null;
      const meta = asRecord(payload?.meta);
      intent = typeof meta?.intent === 'string' ? meta.intent : null;
      answerPreview = payload ? previewFromPayload(payload) : null;
      error = payload && payload.success === false
        ? String(payload.error ?? 'API returned an unsuccessful response')
        : null;
      completed = Boolean(payload?.success);
    } else if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = asRecord(JSON.parse(line));
          if (!event) continue;
          if (event.event === 'route') {
            route = typeof event.route === 'string' ? event.route : route;
            intent = typeof event.intent === 'string' ? event.intent : intent;
          } else if (event.event === 'tool_call') {
            toolCalls += 1;
          } else if (event.event === 'final') {
            const data = asRecord(event.data);
            answerPreview = data ? previewFromPayload(data) : answerPreview;
            completed = event.success === true;
          } else if (event.event === 'error') {
            error = String(event.message ?? 'Streamed API error');
          }
        }
      }
      if (pending.trim()) {
        const event = asRecord(JSON.parse(pending));
        if (event?.event === 'final') {
          const data = asRecord(event.data);
          answerPreview = data ? previewFromPayload(data) : answerPreview;
          completed = event.success === true;
        } else if (event?.event === 'error') {
          error = String(event.message ?? 'Streamed API error');
        }
      }
      if (!completed && !error) error = 'Stream ended before a final response event';
    } else {
      error = 'Response body was empty';
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Unexpected benchmark error';
  } finally {
    clearTimeout(timeout);
  }

  const totalMs = performance.now() - startedAt;
  const timedOut = controller.signal.aborted;
  return {
    ...question,
    status,
    route,
    intent,
    firstResponseMs: firstResponseMs === null ? null : Math.round(firstResponseMs),
    totalMs: Math.round(totalMs),
    toolCalls,
    passed: completed && !error && status !== null && status >= 200 && status < 300,
    timedOut,
    answerPreview,
    error,
  };
}

function percentile(values: number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)] ?? null;
}

function median(values: number[]): number | null {
  return percentile(values, 0.5);
}

function makeReport(results: BenchmarkResult[], options: RunOptions): BenchmarkReport {
  const totalTimes = results.map((result) => result.totalMs);
  const firstTimes = results
    .map((result) => result.firstResponseMs)
    .filter((value): value is number => value !== null);
  const routes = results.reduce<Record<string, number>>((counts, result) => {
    const key = result.route ?? 'no_route';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const levels = (['easy', 'moderate', 'hard', 'extreme'] as const).reduce<BenchmarkReport['summary']['levels']>((summary, level) => {
    const subset = results.filter((result) => result.level === level);
    summary[level] = {
      total: subset.length,
      passed: subset.filter((result) => result.passed).length,
      medianTotalMs: median(subset.map((result) => result.totalMs)),
    };
    return summary;
  }, {} as BenchmarkReport['summary']['levels']);

  return {
    startedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    summary: {
      total: results.length,
      passed: results.filter((result) => result.passed).length,
      failed: results.filter((result) => !result.passed).length,
      timedOut: results.filter((result) => result.timedOut).length,
      medianTotalMs: median(totalTimes),
      p95TotalMs: percentile(totalTimes, 0.95),
      medianFirstResponseMs: median(firstTimes),
      routes,
      levels,
    },
    results,
  };
}

function markdownReport(report: BenchmarkReport): string {
  const lines = [
    '# Chat API benchmark report',
    '',
    `- Started: ${report.startedAt}`,
    `- Target: ${report.baseUrl}`,
    `- Timeout per question: ${report.timeoutMs} ms`,
    `- Passed: ${report.summary.passed}/${report.summary.total}`,
    `- Median total response: ${report.summary.medianTotalMs ?? 'n/a'} ms`,
    `- P95 total response: ${report.summary.p95TotalMs ?? 'n/a'} ms`,
    `- Median first response: ${report.summary.medianFirstResponseMs ?? 'n/a'} ms`,
    '',
    '## By level',
    '',
    '| Level | Passed | Median total |',
    '| --- | ---: | ---: |',
    ...(['easy', 'moderate', 'hard', 'extreme'] as const).map((level) => {
      const data = report.summary.levels[level];
      return `| ${level} | ${data.passed}/${data.total} | ${data.medianTotalMs ?? 'n/a'} ms |`;
    }),
    '',
    '## Results',
    '',
    '| ID | Level | Route / intent | First / total | Tools | Result |',
    '| --- | --- | --- | ---: | ---: | --- |',
    ...report.results.map((result) =>
      `| ${result.id} | ${result.level} | ${(result.route ?? '—')} / ${(result.intent ?? '—')} | ${result.firstResponseMs ?? '—'} / ${result.totalMs} ms | ${result.toolCalls} | ${result.passed ? 'PASS' : `FAIL: ${result.error ?? 'unknown'}`} |`,
    ),
    '',
    '## Notes',
    '',
    '- This is an end-to-end API benchmark. Total time includes routing, database/MCP calls, Bedrock work for AI paths, streaming, and server response generation.',
    '- Questions without a named player, team, venue, or fixture are intentionally retained; failures or clarification responses expose product gaps rather than benchmark errors.',
  ];
  return `${lines.join('\n')}\n`;
}

function writeReports(
  report: BenchmarkReport,
  jsonPath: string,
  markdownPath: string,
): void {
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, markdownReport(report));
}

async function assertServerReachable(baseUrl: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    await fetch(baseUrl, { signal: controller.signal });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Chat benchmark cannot reach ${baseUrl} (${reason}). ` +
        'Start the web app with `pnpm dev:web`, verify the displayed port, then rerun with `--base-url` if needed.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const questions = CHAT_BENCHMARK_QUESTIONS.filter((question) =>
    (!options.levels || options.levels.has(question.level)) &&
    (!options.ids || options.ids.has(question.id)),
  );
  await assertServerReachable(options.baseUrl);
  console.log(`Running ${questions.length} chat API scenarios against ${options.baseUrl}...`);

  const results: BenchmarkResult[] = [];
  const timestamp = Date.now();
  const jsonPath = options.outPath ?? join(__dirname, 'reports', `chat-benchmark-${timestamp}.json`);
  const markdownPath = options.markdownOutPath ?? join(__dirname, 'reports', `chat-benchmark-${timestamp}.md`);
  for (const question of questions) {
    process.stdout.write(`[${results.length + 1}/${questions.length}] ${question.id}... `);
    const result = await runQuestion(question, options);
    results.push(result);
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.totalMs} ms`);
    writeReports(makeReport(results, options), jsonPath, markdownPath);
  }

  const report = makeReport(results, options);
  writeReports(report, jsonPath, markdownPath);

  console.log(`\nPassed ${report.summary.passed}/${report.summary.total}`);
  console.log(`Median total: ${report.summary.medianTotalMs ?? 'n/a'} ms; P95: ${report.summary.p95TotalMs ?? 'n/a'} ms`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${markdownPath}`);
  if (report.summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
