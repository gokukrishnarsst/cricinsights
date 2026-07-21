import { UserSearch } from 'lucide-react';

export default function ScoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_50px_-8px_rgba(34,211,238,.55)]">
        <UserSearch size={26} className="text-white" />
      </div>
      <h1 className="font-display text-5xl font-black">
        PLAYER <span className="gradient-text">INTELLIGENCE</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-ink-soft">
        Full scouting reports with strengths, gaps, phase breakdowns, and elite
        benchmarks — coming soon.
      </p>
    </div>
  );
}
