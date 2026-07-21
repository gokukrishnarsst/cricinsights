import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="relative z-[1] mt-24 border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 sm:flex-row sm:justify-between">
        <div>
          <div className="font-display text-lg font-black tracking-wide">
            CRIC<span className="gradient-text">INSIGHTS</span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Every number from the database. Zero hallucinations.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink-soft">
          <Link href="/scout" className="transition hover:text-accent-2">
            Player Intelligence
          </Link>
          <Link href="/chat" className="transition hover:text-accent-2">
            AI Chat
          </Link>
          <Link href="/compare/players" className="transition hover:text-accent-2">
            Compare Players
          </Link>
          <Link href="/compare/teams" className="transition hover:text-accent-2">
            Teams
          </Link>
          <Link href="/compare/leagues" className="transition hover:text-accent-2">
            League Battle
          </Link>
        </nav>
        <p className="text-xs text-ink-mute">IPL × The Hundred · MVP</p>
      </div>
    </footer>
  );
}
