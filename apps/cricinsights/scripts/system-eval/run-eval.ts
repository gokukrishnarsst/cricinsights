import { SmartRouter, executeFastPath } from '@cricket-ai/smart-router';
import { executeCricketTool, MCP_TOOL_NAMES } from '@cricket-ai/mcp-server';
import { buildManifestFromFastPath } from '@/lib/template-engine.js';
import { EVAL_SCENARIOS, type EvalScenario } from './scenarios.js';
import {
  detectManifestWeaknesses,
  detectMissingComponents,
  detectRoutingWeaknesses,
  IMPROVEMENT_HINTS,
  summarizeByCategory,
  type WeaknessFinding,
} from './weakness-detector.js';

export interface ScenarioResult {
  id: string;
  query: string;
  route: string;
  intent: string;
  latencyMs: number;
  ok: boolean;
  findings: WeaknessFinding[];
  componentTypes: string[];
  error?: string;
}

export interface EvalReport {
  runAt: string;
  env: {
    remoteDb: boolean;
    bedrockEnabled: boolean;
  };
  inventory: {
    localMcpTools: string[];
  };
  scenarios: ScenarioResult[];
  summary: {
    passed: number;
    failed: number;
    byCode: Record<string, number>;
    recommendations: Array<{ area: string; action: string; count: number }>;
  };
  systemStrengths: string[];
  systemWeaknesses: string[];
}

async function runScenario(scenario: EvalScenario): Promise<ScenarioResult> {
  const started = Date.now();
  const router = new SmartRouter();
  const decision = router.classify(scenario.query);
  const findings: WeaknessFinding[] = [
    ...detectRoutingWeaknesses(scenario, {
      route: decision.route,
      intent: decision.intent,
    }),
  ];

  let componentTypes: string[] = [];
  if (decision.route === 'fast_path') {
    try {
      const result = await executeFastPath(decision);
      const manifest = buildManifestFromFastPath(result);
      componentTypes = manifest.components.map((c) => c.type);
      findings.push(...detectMissingComponents(scenario.expectComponents, manifest));

      findings.push(
        ...detectManifestWeaknesses(manifest, {
          query: scenario.query,
          watchFor: scenario.watchFor,
        }),
      );
    } catch (error) {
      findings.push({
        code: 'FAST_PATH_ERROR',
        severity: 'critical',
        message: error instanceof Error ? error.message : String(error),
        hint: IMPROVEMENT_HINTS.FAST_PATH_ERROR.action,
      });
    }
  }

  const critical = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  return {
    id: scenario.id,
    query: scenario.query,
    route: decision.route,
    intent: decision.intent,
    latencyMs: Date.now() - started,
    ok: critical.length === 0,
    findings,
    componentTypes,
  };
}

async function probeLocalDb(): Promise<boolean> {
  try {
    await executeCricketTool('get_player_stats', { name: 'Virat Kohli', league_id: 1 });
    return true;
  } catch {
    return false;
  }
}

function buildRecommendations(
  allFindings: WeaknessFinding[],
): EvalReport['summary']['recommendations'] {
  const byArea = new Map<string, { action: string; count: number }>();
  for (const f of allFindings) {
    const hint = IMPROVEMENT_HINTS[f.code];
    const key = hint.area;
    const prev = byArea.get(key);
    if (prev) prev.count += 1;
    else byArea.set(key, { action: hint.action, count: 1 });
  }
  return [...byArea.entries()]
    .map(([area, { action, count }]) => ({ area, action, count }))
    .sort((a, b) => b.count - a.count);
}

export async function runSystemEval(options?: {
  scenarioIds?: string[];
}): Promise<EvalReport> {
  const scenarios = options?.scenarioIds?.length
    ? EVAL_SCENARIOS.filter((s) => options.scenarioIds!.includes(s.id))
    : EVAL_SCENARIOS;

  const remoteDb = await probeLocalDb();

  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario));
  }

  const allFindings = results.flatMap((r) => r.findings);
  const byCode = summarizeByCategory(allFindings);

  const systemStrengths = [
    'Rule-based SmartRouter gives instant fast_path for stats, compare, scout, IPL standings/leaderboard, and team H2H by name.',
    'In-process MCP tools read Aurora career stats (master.player_career_stats) with stable schemas.',
    'Manifest normalization + tool-call hydration reduces empty UI cells from LLM key drift.',
    'player_scout fast path composes local database statistics without Bedrock latency/cost.',
  ];

  const systemWeaknesses = [
    'Leagues without hints (non-IPL/BBL) still need explicit season_id or AI path.',
    'AI path still depends on model manifest quality — hydration covers common player/league gaps only.',
    'No first-class get_player_intelligence / phase splits in cricinsights (frontend had richer scout).',
    'Pure “why/explain” queries remain on ai_path by design.',
    'Team H2H fast path uses DB name resolution — ambiguous abbreviations may pick wrong franchise.',
  ];

  return {
    runAt: new Date().toISOString(),
    env: {
      remoteDb,
      bedrockEnabled: process.env.BEDROCK_ENABLED !== 'false',
    },
    inventory: {
      localMcpTools: [...MCP_TOOL_NAMES],
    },
    scenarios: results,
    summary: {
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      byCode,
      recommendations: buildRecommendations(allFindings),
    },
    systemStrengths,
    systemWeaknesses,
  };
}

export function formatReportText(report: EvalReport): string {
  const lines: string[] = [];
  lines.push('═'.repeat(60));
  lines.push(' CricInsights system evaluation');
  lines.push('═'.repeat(60));
  lines.push(`Run: ${report.runAt}`);
  lines.push(
    `Env: DB=${report.env.remoteDb ? 'ok' : 'FAIL'} | Bedrock=${report.env.bedrockEnabled}`,
  );
  lines.push(`Local MCP tools (${report.inventory.localMcpTools.length}): ${report.inventory.localMcpTools.join(', ')}`);
  lines.push('');
  lines.push(`Scenarios: ${report.summary.passed} passed, ${report.summary.failed} failed`);
  lines.push('');

  for (const s of report.scenarios) {
    const status = s.ok ? 'PASS' : 'FAIL';
    lines.push(`[${status}] ${s.id} (${s.latencyMs}ms) → ${s.route}/${s.intent}`);
    lines.push(`  Q: ${s.query}`);
    if (s.componentTypes.length) {
      lines.push(`  Components: ${s.componentTypes.join(', ')}`);
    }
    for (const f of s.findings.filter((x) => x.severity === 'critical' || x.severity === 'high')) {
      lines.push(`  ⚠ ${f.code}: ${f.message}`);
      if (f.hint) lines.push(`    → ${f.hint}`);
    }
    if (s.error) lines.push(`  Error: ${s.error}`);
    lines.push('');
  }

  if (Object.keys(report.summary.byCode).length) {
    lines.push('Finding counts by code:');
    for (const [code, n] of Object.entries(report.summary.byCode).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${code}: ${n}`);
    }
    lines.push('');
  }

  if (report.summary.recommendations.length) {
    lines.push('Where to improve (aggregated):');
    for (const r of report.summary.recommendations) {
      lines.push(`  [${r.area}] (${r.count}x) ${r.action}`);
    }
    lines.push('');
  }

  lines.push('── Known architectural strengths ──');
  report.systemStrengths.forEach((s) => lines.push(`  • ${s}`));
  lines.push('── Known architectural weaknesses ──');
  report.systemWeaknesses.forEach((s) => lines.push(`  • ${s}`));
  lines.push('═'.repeat(60));
  return lines.join('\n');
}
