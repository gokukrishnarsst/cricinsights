"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerSearch from "@/components/cricket/PlayerSearch";
import ComparisonView from "@/components/cricket/ComparisonView";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlayerComparison, PlayerSummary } from "@/types/cricket";

export default function ComparePlayersPage() {
  const [playerA, setPlayerA] = useState<PlayerSummary | null>(null);
  const [playerB, setPlayerB] = useState<PlayerSummary | null>(null);
  const [league, setLeague] = useState<"IPL" | "The Hundred">("IPL");
  const [comparison, setComparison] = useState<PlayerComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = async () => {
    if (!playerA || !playerB) return;
    setLoading(true);
    setError(null);
    setComparison(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerA_id: playerA.id,
          playerB_id: playerB.id,
          league,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setComparison(data);
      }
    } catch {
      setError("Failed to load comparison");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="animate-fade-up mb-10 text-center">
        <div className="eyebrow mb-3 flex items-center justify-center gap-2">
          <Swords size={13} />
          Role-Aware Comparison
        </div>
        <h1 className="font-display text-[clamp(2.8rem,6vw,4.2rem)] font-black leading-[0.92]">
          COMPARE ANY <span className="gradient-text">TWO PLAYERS</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[15px] text-ink-soft">
          Intelligent matchup analysis from real match data — batter vs bowler
          handled smartly, phase stats surfaced. Export the result as a
          shareable card when you want to settle the argument publicly.
        </p>
      </div>

      {/* setup arena */}
      <div className="panel animate-fade-up d-2 relative mx-auto mb-12 max-w-3xl overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 90% at 20% 50%, rgba(59,130,246,.08), transparent 60%), radial-gradient(50% 90% at 80% 50%, rgba(34,211,238,.07), transparent 60%)",
          }}
        />

        {/* league segmented control */}
        <div className="relative mb-7 flex justify-center">
          <div className="glass inline-flex rounded-xl p-1">
            {(["IPL", "The Hundred"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLeague(l)}
                className={`rounded-lg px-5 py-2 text-[13px] font-bold transition-all duration-200 ${
                  league === l
                    ? "bg-gradient-to-b from-accent to-[#2563eb] text-white shadow-[0_4px_14px_-4px_rgba(59,130,246,.7)]"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="relative grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <PlayerSearch label="Challenger" value={playerA} onChange={setPlayerA} league={league} />
          <div className="font-display hidden pb-2 text-2xl font-black text-accent-2 [text-shadow:0_0_18px_rgba(8,145,178,.3)] sm:block">
            VS
          </div>
          <PlayerSearch label="Opponent" value={playerB} onChange={setPlayerB} league={league} />
        </div>

        <Button
          className="relative mt-7 w-full"
          size="lg"
          disabled={!playerA || !playerB || loading}
          onClick={compare}
        >
          <Swords size={17} />
          {loading ? "Building duel..." : "Start the duel"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="mx-auto h-8 w-64" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Skeleton className="mx-auto aspect-[540/820] w-full max-w-[260px]" />
            <Skeleton className="h-80" />
            <Skeleton className="mx-auto aspect-[540/820] w-full max-w-[260px]" />
          </div>
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-md rounded-xl border border-rose/30 bg-rose/[0.08] p-4 text-center text-sm text-rose">
          {error}
        </div>
      )}

      {comparison && !loading && <ComparisonView comparison={comparison} />}
    </div>
  );
}
