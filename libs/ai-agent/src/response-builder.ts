import { agentLog } from './logger.js';
import type { UIManifest, UIComponent, AgentResponse } from './types.js';

/**
 * Parse model output text into a UI manifest, tolerating markdown fences.
 */
export function parseModelManifest(text: string): UIManifest {
  const trimmed = text.trim();
  agentLog.step(`Parsing model output (${trimmed.length} chars)`);

  const jsonText = extractJson(trimmed);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    agentLog.warn(
      'Model output is not valid JSON; wrapping raw text in a stats_table component',
    );
    return {
      components: [
        {
          type: 'stats_table',
          data: { rawText: trimmed },
        },
      ],
      narrative: trimmed,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Model response was not a JSON object');
  }

  const obj = parsed as Record<string, unknown>;
  const components = normalizeComponents(obj.components);
  const narrative =
    typeof obj.narrative === 'string' ? obj.narrative : trimmed;

  agentLog.info(
    `Manifest parsed: ${components.length} component(s), narrative ${narrative.length} chars`,
  );

  return { components, narrative };
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

function normalizeComponents(value: unknown): UIComponent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      type: typeof item.type === 'string' ? item.type : 'stats_table',
      data:
        item.data && typeof item.data === 'object' && !Array.isArray(item.data)
          ? (item.data as Record<string, unknown>)
          : { value: item.data ?? null },
    }));
}

/**
 * Build the final agent response envelope.
 */
export function buildAgentResponse(params: {
  manifest: UIManifest;
  toolCalls: AgentResponse['toolCalls'];
  fallback: boolean;
  modelId?: string;
  latencyMs: number;
}): AgentResponse {
  return {
    components: params.manifest.components,
    narrative: params.manifest.narrative,
    toolCalls: params.toolCalls,
    fallback: params.fallback,
    modelId: params.modelId,
    latencyMs: params.latencyMs,
  };
}

/**
 * Build a graceful fallback response when Bedrock is unavailable.
 */
export function buildFallbackResponse(
  latencyMs: number,
  reason?: string,
  toolCalls: AgentResponse['toolCalls'] = [],
): AgentResponse {
  agentLog.warn(
    `Returning fallback response (${latencyMs}ms)${reason ? `: ${reason}` : ''}`,
  );

  return {
    components: [
      {
        type: 'insight_card',
        data: {
          title: 'AI Path unavailable',
          content: [
            reason ?? 'Bedrock is disabled or unreachable',
            'Try a simpler Fast Path query such as "Kohli stats" or "IPL standings".',
          ]
            .filter(Boolean)
            .join(' '),
          severity: 'warning',
        },
      },
    ],
    narrative:
      'AI analysis is temporarily unavailable. Try a simpler query like "Kohli stats" or "IPL standings" — those use our Fast Path and respond instantly.',
    toolCalls,
    fallback: true,
    latencyMs,
  };
}

/**
 * Terminal answer for an otherwise healthy request that could not be resolved
 * to verified database evidence. This is intentionally distinct from a
 * Bedrock/service failure so callers do not label missing coverage as AI down.
 */
export function buildDataUnavailableResponse(
  latencyMs: number,
  reason?: string,
  toolCalls: AgentResponse['toolCalls'] = [],
): AgentResponse {
  const detail = reason
    ? ` ${reason}`
    : '';
  return {
    components: [
      {
        type: 'insight_card',
        data: {
          title: 'No matching database data found',
          content:
            'CricInsights could not resolve a verified database record for this request.' +
            ' Add a player, teams, competition, season, or fixture ID and try again.' + detail,
          severity: 'info',
        },
      },
    ],
    narrative:
      'No verified CricInsights database result is available for that request. ' +
      'Try adding a player, teams, competition, season, or fixture ID.',
    toolCalls,
    fallback: false,
    latencyMs,
  };
}
