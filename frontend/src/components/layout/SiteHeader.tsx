"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Swords, Trophy, BarChart3, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/scout", label: "Intelligence", icon: UserSearch },
  { href: "/compare/players", label: "Compare", icon: Swords },
  { href: "/compare/teams", label: "Teams", icon: Trophy },
  { href: "/compare/leagues", label: "Leagues", icon: BarChart3 },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4 shadow-[0_16px_44px_-18px_rgba(30,46,94,.22)]">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_18px_-4px_rgba(34,211,238,.6)]">
            <span className="font-display text-sm font-black text-bg">CI</span>
          </span>
          <span className="font-display text-lg font-black tracking-wide text-ink transition group-hover:text-accent-hi">
            CRIC<span className="gradient-text">INSIGHTS</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-ink/[0.06] text-ink"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                <Icon size={15} className={active ? "text-accent-2" : ""} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/chat"
            className="shine ml-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-[#2563eb] px-4 py-2 text-[13px] font-bold text-white shadow-[0_0_0_1px_rgba(59,130,246,.4),0_8px_20px_-6px_rgba(59,130,246,.6)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(59,130,246,.6),0_10px_26px_-6px_rgba(59,130,246,.75)] active:translate-y-0"
          >
            <MessageSquare size={15} />
            Ask AI
          </Link>
        </nav>
      </div>
    </header>
  );
}
