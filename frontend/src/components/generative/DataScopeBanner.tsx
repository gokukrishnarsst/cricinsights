import type { UIComponent } from "@/types/generative-ui";
import { Database } from "lucide-react";

export default function DataScopeBanner({
  scope,
  limitations,
  source,
}: {
  scope?: string;
  limitations?: string[];
  source?: string;
}) {
  if (!scope && !limitations?.length && !source) return null;

  return (
    <div className="rounded-xl border border-line/80 bg-surface-2/50 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-mute">
        <Database size={12} className="text-accent-2" />
        Data scope
        {source && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent-2">
            {source}
          </span>
        )}
      </div>
      {scope && (
        <p className="mt-1.5 text-sm text-ink-soft">{scope}</p>
      )}
      {limitations && limitations.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-ink-mute">
          {limitations.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="text-gold">•</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DataScopeFromComponent({
  item,
}: {
  item: Extract<UIComponent, { type: "data_scope" }>;
}) {
  return (
    <DataScopeBanner
      scope={item.scope}
      limitations={item.limitations}
      source={item.source}
    />
  );
}
