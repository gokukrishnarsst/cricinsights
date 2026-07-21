"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerSearch from "@/components/cricket/PlayerSearch";
import ScoutView from "@/components/cricket/ScoutView";
import IntelligencePanel from "@/components/cricket/IntelligencePanel";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  LeagueCode,
  PlayerIntelligence,
  PlayerSummary,
} from "@/types/cricket";

export default function ScoutPage() {
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [league, setLeague] = useState<LeagueCode>("IPL");
  const [intel, setIntel] = useState<PlayerIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scout = async () => {
    if (!player) return;
    setLoading(true);
    setError(null);
    setIntel(null);
    try {
      const res = await fetch(
        `/api/players/${player.id}/intelligence?league=${encodeURIComponent(league)}`,
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to load player");
      } else {
        setIntel(data as PlayerIntelligence);
      }
    } catch {
      setError("Failed to load player intelligence report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setIntel(null);
    setPlayer(null);
    setError(null);
  };

  if (intel) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ScoutView key={intel.card.player.id} card={intel.card} onBack={reset} />
        <IntelligencePanel intelligence={intel} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="animate-fade-up mb-10 text-center">
        <div className="eyebrow mb-3 flex items-center justify-center gap-2">
          <Sparkles size={13} />
          Player Intelligence
        </div>
        <h1 className="font-display text-[clamp(2.8rem,6vw,4.2rem)] font-black leading-[.92]">
          SCOUT A <span className="gradient-text">PLAYER</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[15px] text-ink-soft">
          Search any IPL or Hundred player and get a role-aware intelligence
          report — strengths, development areas, phase impact, and elite
          benchmarks from real match data.
        </p>
      </div>

      <div className="panel animate-fade-up d-2 relative mx-auto overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 90% at 50% 0%, rgba(37,99,235,.08), transparent 60%)",
          }}
        />

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

        <div className="relative">
          <PlayerSearch
            label="Player name"
            value={player}
            onChange={setPlayer}
            league={league}
          />
        </div>

        <Button
          className="relative mt-7 w-full"
          size="lg"
          disabled={!player || loading}
          onClick={scout}
        >
          <Search size={17} />
          {loading ? "Building intelligence report..." : "Generate report"}
        </Button>
      </div>

      {loading && (
        <div className="mt-10 space-y-6">
          <Skeleton className="mx-auto h-24 w-full max-w-xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="mx-auto aspect-[540/820] w-full max-w-[280px]" />
            <Skeleton className="h-64" />
          </div>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-rose/30 bg-rose/[0.08] p-4 text-center text-sm text-rose">
          {error}
        </div>
      )}
    </div>
  );
}
