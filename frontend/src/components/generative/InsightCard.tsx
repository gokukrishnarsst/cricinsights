import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { InsightSeverity } from "@/types/generative-ui";
import { cn } from "@/lib/utils";

const STYLES: Record<
  InsightSeverity,
  { border: string; bg: string; icon: typeof Info; iconClass: string }
> = {
  info: {
    border: "border-accent-2/30",
    bg: "bg-accent-2/5",
    icon: Info,
    iconClass: "text-accent-2",
  },
  warning: {
    border: "border-gold/40",
    bg: "bg-gold/5",
    icon: TriangleAlert,
    iconClass: "text-gold",
  },
  success: {
    border: "border-emerald/40",
    bg: "bg-emerald/5",
    icon: CheckCircle2,
    iconClass: "text-emerald",
  },
  error: {
    border: "border-rose/40",
    bg: "bg-rose/5",
    icon: AlertCircle,
    iconClass: "text-rose",
  },
};

export default function InsightCard({
  title,
  content,
  severity = "info",
}: {
  title: string;
  content: string;
  severity?: InsightSeverity;
}) {
  const style = STYLES[severity] ?? STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        style.border,
        style.bg,
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", style.iconClass)} />
      <div>
        <div className="font-display text-sm font-bold tracking-wide text-ink">
          {title}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{content}</p>
      </div>
    </div>
  );
}
