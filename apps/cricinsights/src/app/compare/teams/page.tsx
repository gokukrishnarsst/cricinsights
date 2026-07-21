import { Trophy } from 'lucide-react';

export default function CompareTeamsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_50px_-8px_rgba(34,211,238,.55)]">
        <Trophy size={26} className="text-white" />
      </div>
      <h1 className="font-display text-5xl font-black">
        TEAM <span className="gradient-text">HEAD-TO-HEAD</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-ink-soft">
        Side-by-side team form, head-to-head records, and fixture history from
        verified league data — coming soon.
      </p>
    </div>
  );
}
