'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUp,
  BarChart3,
  Brain,
  ChevronDown,
  Sparkles,
  Swords,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react';
import { CricketBallSpinner } from '@/components/cricket/CricketBallSpinner';
import {
  ComponentRenderer,
  GenerativeRenderer,
  isWideManifest,
  type UIManifest,
} from '@/components/generative';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  {
    icon: Swords,
    tint: 'text-rose',
    title: 'Kohli intelligence',
    prompt: "What are Virat Kohli's strengths and weaknesses in IPL?",
  },
  {
    icon: BarChart3,
    tint: 'text-emerald',
    title: 'Bumrah career',
    prompt: 'Show Jasprit Bumrah Test ODI T20I and IPL career stats',
  },
  {
    icon: Timer,
    tint: 'text-accent-2',
    title: 'Death specialists',
    prompt: 'Best death bowlers IPL',
  },
  {
    icon: Zap,
    tint: 'text-gold',
    title: 'Powerplay kings',
    prompt: 'Top powerplay performers The Hundred',
  },
] as const;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  manifest?: UIManifest;
  route?: 'fast_path' | 'ai_path';
  latency_ms?: number;
  timestamp: number;
  loading?: boolean;
  streaming?: boolean;
  error?: string;
  agentStatus?: AgentStatus | null;
  thinkingSteps?: string[];
}

interface FastPathResponse {
  success: boolean;
  route?: 'fast_path' | 'ai_path';
  data?: UIManifest;
  meta?: { latency_ms: number; intent: string; cached: boolean };
  error?: string;
}

type StreamEvent = Record<string, unknown>;

interface AgentStatus {
  phase: string;
  tool?: string;
  message: string;
}

const TOOL_FRIENDLY: Record<string, string> = {
  query_player_stats: 'Analyzing player performance...',
  query_batting_stats: 'Reviewing batting numbers...',
  query_bowling_stats: 'Checking bowling figures...',
  query_team_stats: 'Looking at team data...',
  query_head_to_head: 'Comparing head-to-head records...',
  query_fixtures: 'Checking match history...',
  search_players: 'Finding player information...',
  compare_players: 'Running player comparison...',
  compare_entities: 'Running comparison...',
  get_standings: 'Checking standings...',
  query_phase_stats: 'Analyzing phase performance...',
  query_league_stats: 'Comparing league metrics...',
};

const PHASE_FALLBACKS: Record<string, string> = {
  thinking: 'Analyzing your question...',
  tool: 'Gathering cricket data...',
  generating: 'Generating insights...',
  reasoning: 'Reasoning through the data...',
};

function createId() {
  return crypto.randomUUID();
}

function friendlyToolStep(toolName: string): string {
  const key = toolName.replace(/-/g, '_').toLowerCase();
  return TOOL_FRIENDLY[key] ?? TOOL_FRIENDLY[toolName] ?? 'Gathering cricket data...';
}

function sanitizeAgentStatus(status: AgentStatus | null): string {
  if (!status) return 'Analyzing your question...';

  if (status.tool) {
    const mapped = friendlyToolStep(status.tool);
    if (mapped) return mapped;
  }

  let msg = status.message;

  msg = msg.replace(
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|INNER|RIGHT|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|INDEX|VIEW|SCHEMA)\b/gi,
    '',
  );
  msg = msg.replace(/\b(gold|raw|master|matches|stats|etl|insights)\.\w+/gi, 'data');
  msg = msg.replace(/\b(pg_|sql_|db_|query_|mcp_)\w*/gi, '');
  msg = msg.replace(/\b\w+_id\b/gi, '');
  msg = msg.replace(/\{[^}]+\}/g, '');
  msg = msg.replace(/\[[^\]]+\]/g, '');
  msg = msg.replace(/\b(tool:|MCP:)\s*\S+/gi, '');
  msg = msg.replace(/\s+/g, ' ').trim();

  if (msg.length > 120) {
    msg = `${msg.slice(0, 117)}…`;
  }

  if (msg && !/^(select|from|where)/i.test(msg)) {
    return msg;
  }

  return PHASE_FALLBACKS[status.phase] ?? 'Processing...';
}

function sanitizeStepLabel(raw: string): string {
  return sanitizeAgentStatus({
    phase: 'tool',
    message: raw,
  });
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(createId);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialSentRef = useRef(false);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (initialQuery && !initialSentRef.current && messages.length === 0) {
      initialSentRef.current = true;
      void sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isSending) return;

      setIsSending(true);
      setInput('');

      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const assistantId = createId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        loading: true,
        streaming: true,
        agentStatus: { phase: 'thinking', message: 'Analyzing your question...' },
        thinkingSteps: ['Analyzing your question...'],
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, session_id: sessionId }),
        });

        const contentType = response.headers.get('content-type') ?? '';

        if (contentType.includes('application/x-ndjson')) {
          await handleStreamResponse(response, assistantId, updateMessage);
          return;
        }

        const payload = (await response.json()) as FastPathResponse;

        if (!response.ok || !payload.success) {
          updateMessage(assistantId, {
            loading: false,
            streaming: false,
            agentStatus: null,
            error: payload.error ?? 'Something went wrong. Please try again.',
            content: payload.error ?? 'Request failed.',
          });
          return;
        }

        updateMessage(assistantId, {
          loading: false,
          streaming: false,
          route: payload.route ?? 'fast_path',
          latency_ms: payload.meta?.latency_ms,
          manifest: payload.data,
          content: payload.data?.narrative ?? '',
          agentStatus: null,
        });
      } catch (error) {
        updateMessage(assistantId, {
          loading: false,
          streaming: false,
          agentStatus: null,
          error:
            error instanceof Error ? error.message : 'Unable to reach the server.',
          content: 'Unable to connect. Please try again.',
        });
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [isSending, sessionId, updateMessage],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function clearConversation() {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pb-32">
      <div className="flex-1 space-y-7 py-6">
        {isEmpty && !isSending ? (
          <EmptyState onSelect={(query) => void sendMessage(query)} />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={scrollAnchorRef} />
      </div>

      <div className="sticky bottom-5">
        <form
          onSubmit={handleSubmit}
          className="glass flex items-center gap-2 rounded-2xl p-2 pl-5 shadow-[0_18px_44px_-16px_rgba(30,46,94,.28)] transition-all duration-300 focus-within:border-accent-2/50 focus-within:shadow-[0_0_0_1px_rgba(8,145,178,.25),0_18px_44px_-16px_rgba(30,46,94,.28)]"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Compare players, leagues, phases..."
            rows={1}
            disabled={isSending}
            aria-label="Chat message"
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[14.5px] text-ink outline-none placeholder:text-ink-mute disabled:opacity-60"
          />
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={clearConversation}
              title="Clear conversation"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-mute transition hover:bg-ink/[0.04] hover:text-rose"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="shine flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-accent to-[#2563eb] text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,.6)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (query: string) => void }) {
  return (
    <div className="animate-fade-up pt-14 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_50px_-8px_rgba(34,211,238,.55)]">
        <Sparkles size={26} className="text-white" />
      </div>
      <h1 className="font-display text-4xl font-black tracking-wide">
        ASK <span className="gradient-text">CRICINSIGHTS</span>
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] text-ink-soft">
        Every answer is built from real match data — tables, charts, comparisons
        and player intelligence. Never invented.
      </p>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onSelect(s.prompt)}
            className={`panel panel-hover animate-fade-up d-${i + 1} group flex items-start gap-3.5 p-4 text-left`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 transition-colors group-hover:border-accent-2/40">
              <s.icon size={16} className={s.tint} />
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold tracking-wide">
                {s.title.toUpperCase()}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                {s.prompt}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RouteBadge({
  route,
  latencyMs,
}: {
  route: 'fast_path' | 'ai_path';
  latencyMs?: number;
}) {
  const Icon = route === 'fast_path' ? Zap : Brain;
  const label =
    latencyMs === undefined
      ? route === 'fast_path'
        ? 'Instant'
        : 'AI'
      : route === 'fast_path'
        ? `${latencyMs}ms`
        : latencyMs >= 1000
          ? `${(latencyMs / 1000).toFixed(1)}s`
          : `${latencyMs}ms`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-surface-2/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-soft tabular-nums">
      <Icon size={11} className={route === 'fast_path' ? 'text-gold' : 'text-accent-2'} />
      {label}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="animate-rise-soft flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-b from-accent/15 to-accent/10 px-5 py-3 shadow-sm">
          <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const wide = message.manifest ? isWideManifest(message.manifest) : false;

  return (
    <div className="animate-rise-soft flex w-full gap-3.5">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_16px_-4px_rgba(34,211,238,.5)]">
        <Sparkles size={14} className="text-white" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[10px] font-bold tracking-[0.22em] text-ink-faint uppercase">
            CricInsights
          </span>
          {message.route ? (
            <RouteBadge route={message.route} latencyMs={message.latency_ms} />
          ) : message.streaming ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-ink-mute">
              <CricketBallSpinner size={14} />
              Working
            </span>
          ) : null}
        </div>

        {message.error ? (
          <div className="rounded-2xl border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
            {message.error}
          </div>
        ) : null}

        {message.loading && message.streaming ? (
          <ThinkingIndicator
            status={message.agentStatus ?? null}
            steps={message.thinkingSteps ?? []}
            partialNarrative={message.manifest?.narrative}
            partialManifest={message.manifest}
          />
        ) : null}

        {!message.loading && message.manifest ? (
          <div className={cn('w-full space-y-3', wide ? 'max-w-full' : 'max-w-[calc(100%-8px)]')}>
            {message.content ? (
              <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-dim">
                {message.content}
              </p>
            ) : null}
            <ComponentRenderer
              manifest={message.manifest}
              showNarrative={false}
              className="!px-0 !py-0"
            />
          </div>
        ) : null}

        {!message.loading && !message.manifest && message.content && !message.error ? (
          <div className="panel max-w-[calc(100%-46px)] rounded-2xl rounded-tl-md p-5">
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-dim">
              {message.content}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingIndicator({
  status,
  steps,
  partialManifest,
}: {
  status: AgentStatus | null;
  steps: string[];
  partialNarrative?: string;
  partialManifest?: UIManifest;
}) {
  const friendlyMessage = sanitizeAgentStatus(status);
  const displaySteps =
    steps.length > 0 ? steps : [friendlyMessage];

  const hasPartialContent =
    Boolean(partialManifest?.narrative?.trim()) ||
    (partialManifest?.components?.length ?? 0) > 0;

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-full w-full animate-ping rounded-full bg-accent-2 opacity-70" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
        </span>
        <span className="text-sm text-ink-soft">{friendlyMessage}</span>
      </div>

      <details className="group rounded-lg border border-line/60 bg-surface-2/40 px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-ink-faint [&::-webkit-details-marker]:hidden">
          <span>Thinking process</span>
          <ChevronDown
            size={12}
            className="transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-2 space-y-1.5 border-l-2 border-accent-2/20 pl-3 text-xs text-ink-mute">
          {displaySteps.map((step, i) => (
            <p key={`${step}-${i}`}>{step}</p>
          ))}
        </div>
      </details>

      {hasPartialContent ? (
        <ComponentRenderer manifest={partialManifest} className="!px-0 !py-0" />
      ) : (
        <GenerativeRenderer loading />
      )}
    </div>
  );
}

async function handleStreamResponse(
  response: Response,
  assistantId: string,
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    updateMessage(assistantId, {
      loading: false,
      streaming: false,
      agentStatus: null,
      error: 'Empty response stream.',
      content: 'Empty response stream.',
    });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let manifest: UIManifest = { components: [], narrative: '', shareable: true };
  let route: 'fast_path' | 'ai_path' = 'ai_path';
  let latencyMs: number | undefined;
  let thinkingSteps: string[] = ['Analyzing your question...'];
  let agentStatus: AgentStatus = {
    phase: 'thinking',
    message: 'Analyzing your question...',
  };

  const pushStep = (label: string) => {
    const clean = sanitizeStepLabel(label);
    if (!thinkingSteps.includes(clean)) {
      thinkingSteps = [...thinkingSteps, clean];
    }
  };

  const syncStatus = (patch: Partial<ChatMessage> = {}) => {
    updateMessage(assistantId, {
      agentStatus: { ...agentStatus },
      thinkingSteps: [...thinkingSteps],
      ...patch,
    });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;
      applyStreamEvent(event, {
        onRoute: (nextRoute) => {
          route = nextRoute;
          updateMessage(assistantId, { route });
        },
        onPartial: (data) => {
          manifest = {
            components: Array.isArray(data.components)
              ? data.components
              : manifest.components,
            narrative:
              typeof data.narrative === 'string'
                ? data.narrative
                : manifest.narrative,
            shareable: data.shareable !== false,
          };
          agentStatus = {
            phase: 'generating',
            message: 'Generating insights...',
          };
          pushStep('Generating insights...');
          updateMessage(assistantId, {
            route,
            manifest: { ...manifest },
            content: manifest.narrative,
            loading: true,
            streaming: true,
            agentStatus: { ...agentStatus },
            thinkingSteps: [...thinkingSteps],
          });
        },
        onFinal: (payload) => {
          route = payload.route ?? 'ai_path';
          latencyMs = payload.meta?.latency_ms;
          manifest = payload.data ?? manifest;
          updateMessage(assistantId, {
            route,
            latency_ms: latencyMs,
            manifest,
            content: manifest.narrative,
            loading: false,
            streaming: false,
            agentStatus: null,
          });
        },
        onError: (message) => {
          updateMessage(assistantId, {
            loading: false,
            streaming: false,
            agentStatus: null,
            error: message,
            content: message,
          });
        },
        onToolCall: (toolName) => {
          const step = friendlyToolStep(toolName);
          agentStatus = { phase: 'tool', tool: toolName, message: step };
          pushStep(step);
          syncStatus();
        },
        onTextDelta: () => {
          agentStatus = {
            phase: 'generating',
            message: 'Generating insights...',
          };
          syncStatus();
        },
      });
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer) as StreamEvent;
    if (event.event === 'final') {
      const payload = event as unknown as FastPathResponse;
      updateMessage(assistantId, {
        route: payload.route ?? 'ai_path',
        latency_ms: payload.meta?.latency_ms,
        manifest: payload.data,
        content: payload.data?.narrative ?? '',
        loading: false,
        streaming: false,
        agentStatus: null,
      });
    }
  }
}

function applyStreamEvent(
  event: StreamEvent,
  handlers: {
    onRoute: (route: 'fast_path' | 'ai_path') => void;
    onPartial: (data: UIManifest) => void;
    onFinal: (payload: FastPathResponse) => void;
    onError: (message: string) => void;
    onToolCall?: (toolName: string) => void;
    onTextDelta?: (text: string) => void;
  },
) {
  switch (event.event) {
    case 'route':
      handlers.onRoute(
        event.route === 'fast_path' ? 'fast_path' : 'ai_path',
      );
      break;
    case 'partial':
      if (event.data && typeof event.data === 'object') {
        handlers.onPartial(event.data as UIManifest);
      }
      break;
    case 'text_delta':
      if (typeof event.text === 'string') {
        handlers.onTextDelta?.(event.text);
      }
      break;
    case 'tool_call':
      if (typeof event.toolName === 'string') {
        handlers.onToolCall?.(event.toolName);
      }
      break;
    case 'final':
      handlers.onFinal(event as unknown as FastPathResponse);
      break;
    case 'error':
      handlers.onError(
        typeof event.message === 'string'
          ? event.message
          : 'AI analysis failed.',
      );
      break;
    default:
      break;
  }
}
