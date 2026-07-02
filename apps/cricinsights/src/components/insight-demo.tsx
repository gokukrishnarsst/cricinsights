'use client';

import { useEffect, useState } from 'react';
import type { InsightExchange } from '../data/insight-examples';

type Phase = 'idle' | 'question' | 'typing' | 'answer';

const PHASE_MS = {
  idle: 400,
  question: 1200,
  typing: 1400,
  answer: 4500,
} as const;

type InsightDemoProps = {
  exchanges: InsightExchange[];
  delayMs?: number;
};

export function InsightDemo({ exchanges, delayMs = 0 }: InsightDemoProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pairIndex, setPairIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const current = exchanges[pairIndex % exchanges.length];

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    function onChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase('answer');
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function runCycle(from: Phase) {
      if (cancelled) return;

      if (from === 'idle') {
        setPhase('idle');
        timeout = setTimeout(() => runCycle('question'), PHASE_MS.idle);
        return;
      }

      if (from === 'question') {
        setPhase('question');
        timeout = setTimeout(() => runCycle('typing'), PHASE_MS.question);
        return;
      }

      if (from === 'typing') {
        setPhase('typing');
        timeout = setTimeout(() => runCycle('answer'), PHASE_MS.typing);
        return;
      }

      setPhase('answer');
      timeout = setTimeout(() => {
        setPairIndex((i) => (i + 1) % exchanges.length);
        runCycle('idle');
      }, PHASE_MS.answer);
    }

    timeout = setTimeout(() => runCycle('idle'), delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [delayMs, reducedMotion, exchanges.length]);

  const showQuestion = phase === 'question' || phase === 'typing' || phase === 'answer';
  const showTyping = phase === 'typing';
  const showAnswer = phase === 'answer';

  return (
    <div className="h-60 overflow-hidden" aria-live="polite">
      <div className="flex h-full flex-col gap-3">
        <div
          key={`q-${pairIndex}`}
          className={`flex h-23 shrink-0 flex-col items-end justify-end gap-1 transition-all duration-500 ${
            showQuestion
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          }`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-frost/40">
            You
          </span>
          <p className="line-clamp-3 max-w-[95%] rounded-2xl rounded-br-sm border border-white/15 bg-white/10 px-3 py-2 text-left text-xs leading-relaxed text-frost">
            {current.question}
          </p>
        </div>

        <div
          key={`a-${pairIndex}`}
          className={`flex min-h-0 flex-1 flex-col items-start gap-1 transition-all duration-500 ${
            showTyping || showAnswer
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          }`}
        >
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-blue-light/80">
            CricInsights
          </span>

          <div className="flex h-19 w-full items-start">
            {showTyping && !showAnswer && (
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-blue-light/20 bg-blue-deep/30 px-4 py-3">
                <span className="typing-dot" />
                <span className="typing-dot typing-dot-delay-1" />
                <span className="typing-dot typing-dot-delay-2" />
              </div>
            )}

            {showAnswer && (
              <p className="line-clamp-4 max-w-[95%] rounded-2xl rounded-bl-sm border border-blue-light/25 bg-blue-deep/40 px-3 py-2 text-xs leading-relaxed text-sky">
                {current.answer}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
