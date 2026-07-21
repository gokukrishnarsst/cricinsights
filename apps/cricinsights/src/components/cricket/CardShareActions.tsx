'use client';

import { useState } from 'react';
import { toPng } from 'html-to-image';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { renderCardImage } from '@/lib/capture';

const RENDER_OPTS = { pixelRatio: 3, cacheBust: true } as const;

export default function CardShareActions({
  title,
  cardRefs,
  vsRef,
}: {
  title: string;
  cardRefs: React.RefObject<HTMLDivElement | null>[];
  vsRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const captureTarget = () => vsRef?.current ?? cardRefs[0]?.current;

  const download = async () => {
    const node = captureTarget();
    if (!node) return;
    setBusy(true);
    try {
      const dataUrl = await renderCardImage(node, (t) =>
        toPng(t, RENDER_OPTS),
      );
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
      setDone('download');
    } finally {
      setBusy(false);
      setTimeout(() => setDone(null), 1600);
    }
  };

  const copyImage = async () => {
    const node = captureTarget();
    if (!node) return;
    setBusy(true);
    try {
      const blob = await renderCardImage(node, (t) =>
        toPng(t, RENDER_OPTS).then((u) => fetch(u).then((r) => r.blob())),
      );
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setDone('copy');
    } finally {
      setBusy(false);
      setTimeout(() => setDone(null), 1600);
    }
  };

  const shareX = () => {
    const text = encodeURIComponent(`${title} — stats via CricInsights`);
    const url = encodeURIComponent(
      typeof window !== 'undefined' ? window.location.href : '',
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
    );
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const nativeShare = async () => {
    const node = captureTarget();
    if (!node || !canShare) return shareX();
    setBusy(true);
    try {
      const blob = await renderCardImage(node, (t) =>
        toPng(t, RENDER_OPTS).then((u) => fetch(u).then((r) => r.blob())),
      );
      const file = new File([blob], 'cricinsights-card.png', {
        type: 'image/png',
      });
      await navigator.share({ title, files: [file] });
    } catch {
      shareX();
    } finally {
      setBusy(false);
    }
  };

  const btn =
    'flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-ink-soft shadow-sm transition hover:-translate-y-px hover:border-accent/40 hover:bg-surface-2 hover:text-ink disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {canShare && (
        <button
          type="button"
          className={btn}
          onClick={nativeShare}
          disabled={busy}
        >
          <Share2 size={16} />
          Share
        </button>
      )}
      <button type="button" className={btn} onClick={shareX}>
        <Share2 size={16} />
        Post to X
      </button>
      <button type="button" className={btn} onClick={download} disabled={busy}>
        {done === 'download' ? (
          <Check size={16} className="text-accent" />
        ) : (
          <Download size={16} />
        )}
        {done === 'download' ? 'Saved' : 'Download'}
      </button>
      <button type="button" className={btn} onClick={copyImage} disabled={busy}>
        {done === 'copy' ? (
          <Check size={16} className="text-accent" />
        ) : (
          <Copy size={16} />
        )}
        {done === 'copy' ? 'Copied' : 'Copy image'}
      </button>
    </div>
  );
}
