import type { ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import {
  CricketToolExecutionError,
  executeCricketTool,
  MCP_TOOL_NAMES,
  type McpToolName,
} from '@cricket-ai/mcp-server';
import { agentLog } from './logger.js';
import type { AgentToolCallRecord } from './types.js';

const ANALYTICS_TOOL_CONFIGS: NonNullable<ToolConfiguration['tools']> = [
  {
    toolSpec: {
      name: 'search_cricket_entities',
      description: 'Resolve cricket players, teams, leagues, seasons, stages, venues, officials, and reference entities by name.',
      inputSchema: { json: { type: 'object', required: ['entity_type'], properties: {
        entity_type: { type: 'string', enum: ['player', 'team', 'league', 'season', 'stage', 'venue', 'official', 'country', 'position', 'continent'] },
        query: { type: 'string' }, entity_id: { type: 'integer' }, league_id: { type: 'integer' }, season_id: { type: 'integer' }, limit: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_player_match_history',
      description: 'Return bounded match-level batting or bowling performances with named opponents and venues.',
      inputSchema: { json: { type: 'object', required: ['data_type'], properties: {
        player_id: { type: 'integer' }, player_name: { type: 'string' }, data_type: { type: 'string', enum: ['batting', 'bowling', 'combined'] }, league_id: { type: 'integer' }, season_id: { type: 'integer' }, format_type: { type: 'string' }, opponent_team_id: { type: 'integer' }, venue_id: { type: 'integer' }, date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'integer' }, offset: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_match_context',
      description: 'Return fixture lineup, venue, officials, extras, overs, weather, odds, or latest snapshot.',
      inputSchema: { json: { type: 'object', required: ['fixture_id'], properties: {
        fixture_id: { type: 'integer' }, sections: { type: 'array', items: { type: 'string' } },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_ball_analysis',
      description: 'Aggregate ball-by-ball data by over, phase, batter, bowler, dismissal, or partnership.',
      inputSchema: { json: { type: 'object', required: ['analysis_type'], properties: {
        fixture_id: { type: 'integer' }, team_id: { type: 'integer' }, player_id: { type: 'integer' }, league_id: { type: 'integer' }, season_id: { type: 'integer' }, format_type: { type: 'string' }, analysis_type: { type: 'string', enum: ['over', 'phase', 'batter', 'bowler', 'dismissal', 'partnership'] }, phase: { type: 'string', enum: ['powerplay', 'middle', 'death'] }, scoreboard: { type: 'string' }, from_over: { type: 'integer' }, to_over: { type: 'integer' }, limit: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_team_analytics',
      description: 'Analyze team performance by venue, opponent, head-to-head scope, or season.',
      inputSchema: { json: { type: 'object', required: ['data_type'], properties: {
        team_id: { type: 'integer' }, team_name: { type: 'string' }, data_type: { type: 'string', enum: ['venue_split', 'opponent_split', 'head_to_head', 'performance'] }, opponent_team_id: { type: 'integer' }, venue_id: { type: 'integer' }, league_id: { type: 'integer' }, season_id: { type: 'integer' }, date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_venue_stats',
      description: 'Return venue metadata, score patterns, team records, batting splits, or bowling splits.',
      inputSchema: { json: { type: 'object', required: ['data_type'], properties: {
        venue_id: { type: 'integer' }, venue_name: { type: 'string' }, data_type: { type: 'string', enum: ['profile', 'team_record', 'score_patterns', 'batting', 'bowling'] }, team_id: { type: 'integer' }, league_id: { type: 'integer' }, season_id: { type: 'integer' }, limit: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_rankings',
      description: 'Return team rankings by format and gender from master.team_rankings.',
      inputSchema: { json: { type: 'object', required: ['format_type'], properties: {
        format_type: { type: 'string' }, gender: { type: 'string', enum: ['men', 'women', 'mixed'] }, team_id: { type: 'integer' }, team_name: { type: 'string' }, limit: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_trends',
      description: 'Return bounded season, month, or date trends for player, team, league, or venue metrics.',
      inputSchema: { json: { type: 'object', required: ['entity_type', 'entity_id', 'metric', 'grain'], properties: {
        entity_type: { type: 'string', enum: ['player', 'team', 'league', 'venue'] }, entity_id: { type: 'integer' }, metric: { type: 'string', enum: ['runs', 'wickets', 'average', 'strike_rate', 'economy', 'win_rate', 'score'] }, grain: { type: 'string', enum: ['season', 'month', 'date'] }, league_id: { type: 'integer' }, format_type: { type: 'string' }, date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'integer' },
      } } },
    },
  },
  {
    toolSpec: {
      name: 'get_live_match_state',
      description: 'Return the latest match snapshot, innings totals, and optional recent balls.',
      inputSchema: { json: { type: 'object', properties: {
        fixture_id: { type: 'integer' }, team_id: { type: 'integer' }, include_recent_balls: { type: 'boolean' }, recent_ball_limit: { type: 'integer' },
      } } },
    },
  },
];

/** Bedrock tool configuration for in-process cricket MCP tools. */
export const CRICKET_LOCAL_BEDROCK_TOOLS: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: 'get_player_stats',
        description:
          'Search player by name or ID; return profile and career stats. Params: player_id?, name?, format_type?, league_id?, season_id?, season_year?, position_id?, batting_style?, bowling_style?',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              player_id: { type: 'integer' },
              name: { type: 'string' },
              format_type: { type: 'string' },
              league_id: { type: 'integer' },
              season_id: { type: 'integer' },
              season_year: { type: 'string' },
              position_id: { type: 'integer' },
              batting_style: { type: 'string' },
              bowling_style: { type: 'string' },
            },
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_team_data',
        description:
          'Team profile, squad, form, or season stats. Params: team_id, data_type (profile|squad|form|season_stats), season_id?, league_id?, form_limit?',
        inputSchema: {
          json: {
            type: 'object',
            required: ['team_id', 'data_type'],
            properties: {
              team_id: { type: 'integer' },
              data_type: {
                type: 'string',
                enum: ['profile', 'squad', 'form', 'season_stats'],
              },
              season_id: { type: 'integer' },
              league_id: { type: 'integer' },
              form_limit: { type: 'integer' },
            },
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_match_data',
        description:
          'Full match details and scorecard. Params: fixture_id?, team_id?, or team_a_name + team_b_name with optional year, match_format, league_name. A name-based lookup returns one scorecard, or an explicit not_found/ambiguous database result.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              fixture_id: { type: 'integer' },
              team_id: { type: 'integer' },
              team_a_name: { type: 'string' },
              team_b_name: { type: 'string' },
              year: { type: 'integer' },
              match_format: { type: 'string' },
              league_name: { type: 'string' },
              recent_limit: { type: 'integer' },
            },
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_fixtures',
        description:
          'List named fixtures by league+season or team, with stage, venue, format, status, and date filters.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              league_id: { type: 'integer' },
              season_id: { type: 'integer' },
              team_id: { type: 'integer' },
              status: { type: 'string' },
              limit: { type: 'integer' },
              stage_id: { type: 'integer' },
              venue_id: { type: 'integer' },
              match_format: { type: 'string' },
            },
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_league_data',
        description:
          'Standings, leaderboard, fixtures, season overview, or stage overview. Params: league_id, season_id, data_type, stage_id, leaderboard_metric?',
        inputSchema: {
          json: {
            type: 'object',
            required: ['league_id', 'season_id', 'data_type'],
            properties: {
              league_id: { type: 'integer' },
              season_id: { type: 'integer' },
              data_type: {
                type: 'string',
                enum: ['standings', 'leaderboard', 'fixtures', 'season_winner', 'season_overview', 'stage_overview'],
              },
              leaderboard_metric: { type: 'string' },
              fixture_status: { type: 'string' },
              stage_id: { type: 'integer' },
              stage_type: { type: 'string' },
              limit: { type: 'integer' },
            },
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'compare_entities',
        description:
          'Compare players, teams, or batsman vs bowler. Params: comparison_type, entity_a_id, entity_b_id, league_id?, format_type?',
        inputSchema: {
          json: {
            type: 'object',
            required: ['comparison_type', 'entity_a_id', 'entity_b_id'],
            properties: {
              comparison_type: {
                type: 'string',
                enum: ['player_vs_player', 'team_vs_team', 'batsman_vs_bowler'],
              },
              entity_a_id: { type: 'integer' },
              entity_b_id: { type: 'integer' },
              league_id: { type: 'integer' },
              season_id: { type: 'integer' },
              format_type: { type: 'string' },
              limit: { type: 'integer' },
            },
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_insight',
        description:
          'Retrieve pre-computed insight manifest. Params: insight_type, insight_key',
        inputSchema: {
          json: {
            type: 'object',
            required: ['insight_type', 'insight_key'],
            properties: {
              insight_type: { type: 'string' },
              insight_key: { type: 'string' },
            },
          },
        },
      },
    },
    ...ANALYTICS_TOOL_CONFIGS,
  ],
};

/** @deprecated Use resolveAgentTools() for the in-process MCP tool configuration. */
export const CRICKET_BEDROCK_TOOLS = CRICKET_LOCAL_BEDROCK_TOOLS;

const VALID_TOOL_NAMES = new Set<string>(MCP_TOOL_NAMES);

/**
 * Execute an in-process Cricket MCP tool requested by Bedrock.
 */
export async function executeBedrockToolCall(
  toolName: string,
  input: Record<string, unknown>,
): Promise<{ output: Record<string, unknown>; record: AgentToolCallRecord }> {
  agentLog.step(`Tool invoke: ${toolName} input=${agentLog.summarizeJson(input)}`);
  const started = Date.now();

  const record: AgentToolCallRecord = {
    toolName,
    input,
  };

  if (!VALID_TOOL_NAMES.has(toolName)) {
    agentLog.error(`Unknown tool requested by model: ${toolName}`);
    throw new Error(`Unknown tool requested by model: ${toolName}`);
  }

  try {
    const output = await executeCricketTool(toolName as McpToolName, input);
    record.output = output;
    agentLog.info(
      `Tool completed: ${toolName} (${Date.now() - started}ms) keys=${Object.keys(output).join(', ') || 'none'}`,
    );
    agentLog.debug(`Tool output preview: ${agentLog.summarizeJson(output)}`);
    return { output, record };
  } catch (error: unknown) {
    const message =
      error instanceof CricketToolExecutionError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Tool execution failed';
    record.error = message;
    agentLog.error(`Tool failed: ${toolName} (${Date.now() - started}ms)`, error);
    throw error;
  }
}
