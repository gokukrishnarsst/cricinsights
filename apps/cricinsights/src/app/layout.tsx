import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://cricinsights.com'),
  title: 'CricInsights | AI Cricket Intelligence',
  description:
    'Compare players, teams, and leagues. Ask questions and get data-driven cricket insights powered by AI.',
  openGraph: {
    title: 'CricInsights | Coming Soon',
    description:
      'AI-powered cricket intelligence. Compare players, teams, and leagues.',
    url: 'https://cricinsights.com',
    siteName: 'CricInsights',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CricInsights | Coming Soon',
    description:
      'AI-powered cricket intelligence. Compare players, teams, and leagues.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
