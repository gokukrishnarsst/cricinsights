import { getStandingsTool } from "@/lib/mcp/tools";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

interface Standing {
  team: string;
  points: number;
  nrr: number;
}

const MEDALS = ["text-gold", "text-ink-dim", "text-[#b87333]", "text-ink-mute"];

function LeagueTable({
  title,
  teams,
  accent,
  glow,
}: {
  title: string;
  teams: Standing[];
  accent: string;
  glow: string;
}) {
  const maxPts = Math.max(...teams.map((t) => t.points));
  return (
    <div className="panel panel-hover overflow-hidden p-0">
      <div
        className="flex items-center gap-2.5 border-b border-line/70 px-6 py-4"
        style={{ background: `linear-gradient(120deg, ${glow}, transparent 60%)` }}
      >
        <Trophy size={16} className={accent} />
        <h2 className={`font-display text-xl font-bold tracking-wide ${accent}`}>
          {title.toUpperCase()}
        </h2>
      </div>
      <div className="divide-y divide-line/50">
        {teams.map((t, i) => (
          <div key={t.team} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-ink/[0.03]">
            <span className={`font-display w-7 text-xl font-black ${MEDALS[i] ?? "text-ink-mute"}`}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-semibold text-ink">{t.team}</div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent-2"
                  style={{ width: `${(t.points / maxPts) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[15px] font-bold tabular-nums text-ink">{t.points}</div>
              <div className={`font-mono text-[11px] tabular-nums ${t.nrr >= 0 ? "text-emerald" : "text-rose"}`}>
                {t.nrr >= 0 ? "+" : ""}
                {t.nrr}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CompareTeamsPage() {
  const ipl = (await getStandingsTool.handler({ league: "IPL", limit: 4 })) as Standing[];
  const hundred = (await getStandingsTool.handler({
    league: "The Hundred",
    limit: 4,
  })) as Standing[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="animate-fade-up mb-12 text-center">
        <div className="eyebrow mb-3">Standings</div>
        <h1 className="font-display text-[clamp(2.8rem,6vw,4.2rem)] font-black leading-[0.92]">
          TOP <span className="gradient-text">TEAMS</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
          Points, net run rate and form — IPL and The Hundred side by side.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="animate-fade-up d-2">
          <LeagueTable
            title="IPL"
            teams={ipl}
            accent="text-accent"
            glow="rgba(59,130,246,.1)"
          />
        </div>
        <div className="animate-fade-up d-3">
          <LeagueTable
            title="The Hundred"
            teams={hundred}
            accent="text-accent-2"
            glow="rgba(34,211,238,.08)"
          />
        </div>
      </div>
    </div>
  );
}
