'use client';

import { useCallback, useState } from 'react';
import type { ShareButtonData, UIManifest } from './types';
import { cn } from './utils';

interface ShareButtonProps {
  data?: ShareButtonData;
  manifest?: UIManifest;
  className?: string;
  onShare?: (manifest: UIManifest) => void;
}

export function ShareButton({
  data,
  manifest,
  className,
  onShare,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const targetManifest = manifest ?? data?.manifest;
  const shareTitle = data?.title ?? 'CricInsights';
  const shareText =
    data?.text ??
    targetManifest?.narrative ??
    'Check out this cricket insight from CricInsights';
  const shareUrl =
    data?.url ??
    (typeof window !== 'undefined' ? window.location.href : 'https://cricinsights.com');

  const handleShare = useCallback(async () => {
    if (targetManifest && onShare) {
      onShare(targetManifest);
      return;
    }

    const payload = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(payload);
        return;
      }

      const clip = `${shareTitle}\n\n${shareText}\n\n${shareUrl}`;
      await navigator.clipboard.writeText(clip);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [onShare, shareText, shareTitle, shareUrl, targetManifest]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-accent-2/30 bg-accent-2/8 px-3.5 py-2 text-xs font-semibold text-accent-2 transition hover:bg-accent-2/15',
        className,
      )}
    >
      <ShareIcon />
      {copied ? 'Link copied!' : 'Share insight'}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
