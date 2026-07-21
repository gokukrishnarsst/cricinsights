import type { CricInsightsResponse } from "@/types/generative-ui";
import type {
  AgentRunMode,
  AgentRunOptions,
  ChatMessage,
} from "@architecture/types/chat";

export interface AgentStatusEvent {
  phase: "thinking" | "tool" | "finalizing";
  tool?: string;
  message: string;
}

export type AgentStreamEventType =
  | "status"
  | "text-delta"
  | "result"
  | "error"
  | "done";

export interface AgentStreamEvent {
  event: AgentStreamEventType;
  data:
    | AgentStatusEvent
    | { delta: string }
    | CricInsightsResponse
    | { message: string; code?: string }
    | Record<string, never>;
}

export interface AgentRunResult extends CricInsightsResponse {
  sessionId: string;
  mode: AgentRunMode;
  toolCalls?: string[];
}

export type { AgentRunMode, AgentRunOptions, ChatMessage };
