import { UI_COMPONENT_TYPES } from "@/types/generative-ui";

export default function UnknownComponentFallback({ type }: { type: string }) {
  const known = UI_COMPONENT_TYPES.includes(
    type as (typeof UI_COMPONENT_TYPES)[number],
  );

  return (
    <div className="rounded-xl border border-dashed border-line bg-surface-2/30 px-4 py-3 text-sm text-ink-mute">
      {known ? (
        <>Component <code className="text-accent-2">{type}</code> could not be rendered — missing data.</>
      ) : (
        <>
          Unknown UI component <code className="text-gold">{type}</code>. Supported:{" "}
          {UI_COMPONENT_TYPES.slice(0, 6).join(", ")}…
        </>
      )}
    </div>
  );
}
