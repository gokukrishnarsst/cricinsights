"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerSummary } from "@/types/cricket";

export default function PlayerSearch({
  label,
  value,
  onChange,
  league,
}: {
  label: string;
  value: PlayerSummary | null;
  onChange: (p: PlayerSummary | null) => void;
  league?: "IPL" | "The Hundred";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/players/search?q=${encodeURIComponent(query)}${league ? `&league=${encodeURIComponent(league)}` : ""}`,
        );
        const data = await res.json();
        setResults(data.players ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, league]);

  return (
    <div className="relative">
      <label className="eyebrow mb-2.5 block !text-[10px] !tracking-[0.28em] text-ink-faint">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border bg-card px-4 text-left text-[14.5px] shadow-sm transition-all duration-200",
          open
            ? "border-accent-2/50 shadow-[0_0_0_1px_rgba(8,145,178,.2),0_0_30px_-10px_rgba(8,145,178,.35)]"
            : "border-line hover:border-line-hi",
          value ? "font-semibold text-ink" : "text-ink-mute",
        )}
      >
        <span className="truncate">{value?.fullname ?? "Search player..."}</span>
        <ChevronsUpDown size={15} className="shrink-0 text-ink-faint" />
      </button>

      {open && (
        <div className="animate-rise-soft absolute z-50 mt-2 w-full rounded-2xl border border-line bg-surface p-2 shadow-[0_24px_56px_-12px_rgba(30,46,94,.28)]">
          <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
            <Search size={14} className="shrink-0 text-ink-faint" />
            <input
              autoFocus
              className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
              placeholder="Type player name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading && (
              <div className="px-3 py-2.5 text-sm text-ink-mute">Searching...</div>
            )}
            {!loading && results.length === 0 && query.length >= 2 && (
              <div className="px-3 py-2.5 text-sm text-ink-mute">No players found</div>
            )}
            {!loading && query.length < 2 && (
              <div className="px-3 py-2.5 text-[13px] text-ink-mute">
                Try &ldquo;Kohli&rdquo;, &ldquo;Buttler&rdquo;, &ldquo;Rashid&rdquo;...
              </div>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04]"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <Check
                  size={14}
                  className={cn(
                    "shrink-0 text-accent-2",
                    value?.id === p.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-medium text-ink">{p.fullname}</span>
                <span className="ml-auto flex items-center gap-2">
                  {p.role && (
                    <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      {p.role === "all-rounder" ? "AR" : p.role.slice(0, 3)}
                    </span>
                  )}
                  {p.team && (
                    <span className="hidden text-xs text-ink-mute sm:inline">{p.team}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
