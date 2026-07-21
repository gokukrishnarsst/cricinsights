/** Supported Generative UI component types for CricInsights responses. */
export type UIComponentType =
  | 'player_card'
  | 'comparison_card'
  | 'stats_table'
  | 'trend_chart'
  | 'scorecard_view'
  | 'leaderboard_table'
  | 'match_preview_card'
  | 'social_share_card'
  | 'heatmap_view'
  | 'worm_chart'
  | 'error_card';

export interface UIComponent {
  type: UIComponentType | string;
  data: Record<string, unknown>;
}

export interface UIManifest {
  components: UIComponent[];
  narrative: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface AgentResponse {
  components: UIComponent[];
  narrative: string;
  toolCalls: AgentToolCallRecord[];
  fallback: boolean;
  modelId?: string;
  latencyMs: number;
}

export type AgentStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; toolName: string; input: Record<string, unknown> }
  | { type: 'tool_call_result'; toolName: string; output: Record<string, unknown> }
  | { type: 'tool_call_error'; toolName: string; error: string }
  | { type: 'final'; response: AgentResponse }
  | { type: 'error'; message: string; fallback: boolean };

export interface CricketAgentOptions {
  modelId?: string;
  maxToolIterations?: number;
  region?: string;
}

export interface BedrockConverseResult {
  stopReason?: string;
  outputText: string;
  toolUses: BedrockToolUseRequest[];
  rawMessage?: BedrockAssistantMessage;
}

export interface BedrockToolUseRequest {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface BedrockAssistantMessage {
  role: 'assistant';
  content: BedrockContentBlock[];
}

export interface BedrockUserMessage {
  role: 'user';
  content: BedrockContentBlock[];
}

export type BedrockMessage = BedrockUserMessage | BedrockAssistantMessage;

export type BedrockContentBlock =
  | { text: string }
  | {
      toolUse: {
        toolUseId: string;
        name: string;
        input: Record<string, unknown>;
      };
    }
  | {
      toolResult: {
        toolUseId: string;
        content: Array<{ json: Record<string, unknown> } | { text: string }>;
        status?: 'success' | 'error';
      };
    };

export type BedrockStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'message_stop'; stopReason?: string; outputText: string; toolUses: BedrockToolUseRequest[] }
  | { type: 'error'; error: Error };
