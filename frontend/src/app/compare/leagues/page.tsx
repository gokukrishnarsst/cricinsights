import GenerativeRenderer from "@/components/generative/GenerativeRenderer";
import { compareLeaguesTool } from "@/lib/mcp/index";
import type { LeagueComparisonResult } from "@/types/cricket";

export const dynamic = "force-dynamic";

export default async function LeagueComparePage() {
  const data = (await compareLeaguesTool.handler({
    leagueA: "IPL",
    leagueB: "The Hundred",
  })) as LeagueComparisonResult;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="animate-fade-up mb-12 text-center">
        <div className="eyebrow mb-3 !text-gold">League Battle</div>
        <h1 className="font-display text-[clamp(2.8rem,6vw,4.2rem)] font-black leading-[0.92]">
          IPL <span className="mx-2 text-[0.5em] text-ink-mute">VS</span>{" "}
          <span className="gradient-text">THE HUNDRED</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] text-ink-soft">{data.summary}</p>
      </div>

      {/* butterfly metric rows */}
      <div className="panel animate-fade-up d-2 mb-10 p-6 sm:p-10">
        <div className="mb-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.24em]">
          <span className="flex items-center gap-2 text-accent">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,.8)]" />
            IPL
          </span>
          <span className="flex items-center gap-2 text-accent-2">
            The Hundred
            <span className="h-2 w-2 rounded-full bg-accent-2 shadow-[0_0_8px_rgba(34,211,238,.8)]" />
          </span>
        </div>
        <div className="space-y-6">
          {data.metrics.map((m) => {
            const total = m.ipl + m.hundred;
            const pctA = (m.ipl / total) * 100;
            const iplWins = m.ipl > m.hundred;
            return (
              <div key={m.label}>
                <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
                  <span
                    className={`text-left font-mono text-lg tabular-nums ${iplWins ? "text-accent" : "text-ink-faint"}`}
                  >
                    {m.ipl}
                    {m.unit === "%" ? "%" : ""}
                  </span>
                  <span className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                    {m.label}
                  </span>
                  <span
                    className={`text-right font-mono text-lg tabular-nums ${!iplWins ? "text-accent-2" : "text-ink-faint"}`}
                  >
                    {m.hundred}
                    {m.unit === "%" ? "%" : ""}
                  </span>
                </div>
                <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className="rounded-full bg-gradient-to-r from-accent/50 to-accent transition-all duration-700"
                    style={{
                      width: `${pctA}%`,
                      boxShadow: iplWins ? "0 0 14px rgba(59,130,246,.5)" : undefined,
                    }}
                  />
                  <div
                    className="flex-1 rounded-full bg-gradient-to-r from-accent-2 to-accent-2/50 transition-all duration-700"
                    style={{
                      boxShadow: !iplWins ? "0 0 14px rgba(34,211,238,.5)" : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* chart view */}
      <div className="panel animate-fade-up d-3 p-6 sm:p-8">
        <div className="eyebrow mb-4">Chart View</div>
        <GenerativeRenderer data={{ type: "league_comparison", data }} />
      </div>
    </div>
  );
}
