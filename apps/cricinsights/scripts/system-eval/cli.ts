#!/usr/bin/env node
/**
 * CricInsights system evaluation CLI — find routing, MCP, and manifest weaknesses.
 *
 * Usage (from cricket-ai root, with .env loaded):
 *   pnpm eval:system
 *   pnpm eval:system -- --json
 *   pnpm eval:system -- --id scout-kohli-ipl,stats-kohli-ipl
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatReportText, runSystemEval } from './run-eval.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../../');

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(join(repoRoot, '.env'));
loadEnvFile(join(repoRoot, 'apps/cricinsights/.env.local'));

function parseArgs(argv: string[]) {
  const json = argv.includes('--json');
  const idIdx = argv.indexOf('--id');
  const scenarioIds =
    idIdx >= 0 && argv[idIdx + 1]
      ? argv[idIdx + 1].split(',').map((s) => s.trim())
      : undefined;
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : undefined;
  return { json, scenarioIds, outPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await runSystemEval({
    scenarioIds: args.scenarioIds,
  });

  const text = formatReportText(report);
  console.log(text);

  const defaultOut = join(__dirname, 'reports', `eval-${Date.now()}.json`);
  const outFile = args.outPath ?? defaultOut;
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nJSON report: ${outFile}`);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
