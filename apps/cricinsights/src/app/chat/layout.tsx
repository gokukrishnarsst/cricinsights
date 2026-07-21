import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CricketBallSpinner } from '@/components/cricket/CricketBallSpinner';

export const metadata: Metadata = {
  title: 'CricInsights AI Chat',
  description:
    'Ask cricket questions and get instant stats or AI-powered insights with interactive visualizations.',
  openGraph: {
    title: 'CricInsights AI Chat',
    description:
      'Ask cricket questions and get instant stats or AI-powered insights.',
    type: 'website',
  },
};

function ChatFallback() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-88px)] max-w-3xl items-center justify-center px-4">
      <span className="inline-flex items-center gap-2 text-sm text-ink-mute">
        <CricketBallSpinner size={18} />
        Loading chat…
      </span>
    </div>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<ChatFallback />}>{children}</Suspense>;
}
