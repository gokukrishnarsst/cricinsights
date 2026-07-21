"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUp,
  BarChart3,
  Loader2,
  Sparkles,
  Swords,
  Timer,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GenerativeRenderer, {
  isWideGenerativeComponent,
} from "@/components/generative/GenerativeRenderer";
import type { CricInsightsResponse } from "@/types/generative-ui";

interface Message {
  role: "user" | "assistant";
  content: string;
  ui?: CricInsightsResponse["ui"];
}

interface AgentStatus {
  phase: string;
  tool?: string;
  message: string;
}

function hasWideUi(ui?: CricInsightsResponse["ui"]) {
  if (!ui) return false;
  const items = Array.isArray(ui) ? ui : [ui];
  return items.some((item) => isWideGenerativeComponent(item.type));
}

const SUGGESTIONS = [
  {
    icon: Swords,
    tint: "text-rose",
    title: "Kohli intelligence",
    prompt: "What are Virat Kohli's strengths and weaknesses in IPL?",
  },
  {
    icon: BarChart3,
    tint: "text-emerald",
    title: "Bumrah career",
    prompt: "Show Jasprit Bumrah Test ODI T20I and IPL career stats",
  },
  {
    icon: Timer,
    tint: "text-accent-2",
    title: "Death specialists",
    prompt: "Best death bowlers IPL",
  },
  {
    icon: Zap,
    tint: "text-gold",
    title: "Powerplay kings",
    prompt: "Top powerplay performers The Hundred",
  },
];

export default function ChatClient() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initial = params.get("q");

  useEffect(() => {
    if (initial && messages.length === 0) {
      void send(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cric-chat");
      if (raw && !initial) setMessages(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [initial]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);
    setAgentStatus({ phase: "thinking", message: "Analyzing your question..." });

    const sessionId =
      typeof window !== "undefined"
        ? localStorage.getItem("cric-session-id") ?? crypto.randomUUID()
        : undefined;
    if (sessionId && typeof window !== "undefined") {
      localStorage.setItem("cric-session-id", sessionId);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          sessionId,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        let assistantUi: CricInsightsResponse["ui"];
        let streamStarted = false;

        const upsertAssistant = (content: string, ui?: CricInsightsResponse["ui"]) => {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { role: "assistant", content, ui: ui ?? last.ui };
            } else {
              copy.push({ role: "assistant", content, ui });
            }
            return copy;
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const lines = chunk.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event: "));
            const dataLine = lines.find((l) => l.startsWith("data: "));
            if (!eventLine || !dataLine) continue;

            const event = eventLine.replace("event: ", "").trim();
            const data = JSON.parse(dataLine.replace("data: ", "")) as Record<
              string,
              unknown
            >;

            if (event === "status") {
              setAgentStatus({
                phase: String(data.phase ?? "thinking"),
                tool: data.tool as string | undefined,
                message: String(data.message ?? "Working..."),
              });
            }

            if (event === "text-delta") {
              if (!streamStarted) {
                streamStarted = true;
                upsertAssistant("");
              }
              assistantText += String(data.delta ?? "");
              upsertAssistant(assistantText, assistantUi);
            }

            if (event === "result") {
              const result = data as unknown as CricInsightsResponse;
              assistantText = result.text ?? assistantText;
              assistantUi = result.ui;
              upsertAssistant(assistantText, assistantUi);
            }

            if (event === "error") {
              upsertAssistant(
                String(data.message ?? "Something went wrong. Please try again."),
              );
            }
          }
        }

        if (!streamStarted) {
          upsertAssistant(assistantText || "No response received.", assistantUi);
        }

        const stored = [
          ...nextMessages,
          {
            role: "assistant" as const,
            content: assistantText,
            ui: assistantUi,
          },
        ];
        localStorage.setItem("cric-chat", JSON.stringify(stored.slice(-20)));
      } else {
        const data = (await res.json()) as CricInsightsResponse & {
          error?: string;
        };
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.text ?? data.error ?? "No response",
            ui: data.ui,
          },
        ]);
        const stored = [
          ...nextMessages,
          { role: "assistant" as const, content: data.text, ui: data.ui },
        ];
        localStorage.setItem("cric-chat", JSON.stringify(stored.slice(-20)));
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setAgentStatus(null);
    }
  };

  const clear = () => {
    setMessages([]);
    localStorage.removeItem("cric-chat");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-88px)] max-w-3xl flex-col px-4 pb-32">
      <div className="flex-1 space-y-7 py-6">
        {/* empty state */}
        {messages.length === 0 && !loading && (
          <div className="animate-fade-up pt-14 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_50px_-8px_rgba(34,211,238,.55)]">
              <Sparkles size={26} className="text-white" />
            </div>
            <h1 className="font-display text-4xl font-black tracking-wide">
              ASK <span className="gradient-text">CRICINSIGHTS</span>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[15px] text-ink-soft">
              Every answer is built from real match data — tables, charts,
              comparisons and player intelligence. Never invented.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => send(s.prompt)}
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
        )}

        {/* thread */}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-b from-accent/15 to-accent/10 px-5 py-3 shadow-sm">
                <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">
                  {m.content}
                </p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex w-full gap-3.5">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_16px_-4px_rgba(34,211,238,.5)]">
                <Sparkles size={14} className="text-white" />
              </span>
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-2xl rounded-tl-md p-5",
                  hasWideUi(m.ui)
                    ? "max-w-full bg-transparent p-0 pt-1"
                    : "panel max-w-[calc(100%-46px)]",
                )}
              >
                {!hasWideUi(m.ui) && (
                  <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-dim">
                    {m.content}
                  </p>
                )}
                {hasWideUi(m.ui) && m.content && (
                  <p className="mb-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-dim">
                    {m.content}
                  </p>
                )}
                {m.ui ? (
                  <GenerativeRenderer data={m.ui} />
                ) : null}
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex w-full gap-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2">
              <Loader2 size={14} className="animate-spin text-white" />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2 text-sm text-ink-faint">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-accent-2 opacity-70" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
                </span>
                Fetching cricket stats...
                {agentStatus && (
                  <span className="text-ink-mute">
                    {" "}
                    — {agentStatus.message}
                    {agentStatus.tool ? ` (${agentStatus.tool})` : ""}
                  </span>
                )}
              </div>
              {agentStatus?.phase === "tool" && (
                <GenerativeRenderer loading />
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="sticky bottom-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="glass flex items-center gap-2 rounded-2xl p-2 pl-5 shadow-[0_18px_44px_-16px_rgba(30,46,94,.28)] transition-all duration-300 focus-within:border-accent-2/50 focus-within:shadow-[0_0_0_1px_rgba(8,145,178,.25),0_18px_44px_-16px_rgba(30,46,94,.28)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Compare players, leagues, phases..."
            className="h-11 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-mute"
            disabled={loading}
          />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              title="Clear conversation"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-mute transition hover:bg-ink/[0.04] hover:text-rose"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shine flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-accent to-[#2563eb] text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,.6)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
