'use client';

import type { NarrativeBlockData } from './types';
import { cn } from './utils';

interface NarrativeBlockProps {
  text?: string;
  data?: NarrativeBlockData;
  className?: string;
}

/** Light inline narrative — no heavy card chrome (chat already has a panel). */
export function NarrativeBlock({ text, data, className }: NarrativeBlockProps) {
  const content = text ?? data?.text ?? data?.narrative ?? '';

  if (!content.trim()) return null;

  return (
    <p
      className={cn(
        'text-[14.5px] leading-relaxed text-ink-dim',
        className,
      )}
    >
      {content}
    </p>
  );
}
