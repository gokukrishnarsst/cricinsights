export interface CompactToolResult {
  output: Record<string, unknown>;
  truncated: boolean;
}

const MAX_ARRAY_ITEMS = 30;
const MAX_STRING_CHARS = 3_000;
const MAX_DEPTH = 7;

/** Keep tool-result context useful while preventing a large result from consuming the next model turn. */
export function compactToolResultForModel(
  output: Record<string, unknown>,
): CompactToolResult {
  let truncated = false;

  const compact = (value: unknown, depth: number): unknown => {
    if (depth >= MAX_DEPTH) {
      truncated = true;
      return '[nested value omitted]';
    }
    if (typeof value === 'string') {
      if (value.length <= MAX_STRING_CHARS) return value;
      truncated = true;
      return `${value.slice(0, MAX_STRING_CHARS)}…`;
    }
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => compact(item, depth + 1));
      if (value.length > MAX_ARRAY_ITEMS) {
        truncated = true;
        return {
          items,
          totalCount: value.length,
          returnedCount: items.length,
          truncated: true,
        };
      }
      return items;
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, child]) => [
          key,
          compact(child, depth + 1),
        ]),
      );
    }
    return value;
  };

  const compacted = compact(output, 0) as Record<string, unknown>;
  if (!truncated) return { output: compacted, truncated: false };
  return {
    output: {
      ...compacted,
      toolResultMeta: {
        truncated: true,
        note: 'Only a bounded subset was sent to the model. Use the returned rows; do not repeat the same query for confirmation.',
      },
    },
    truncated: true,
  };
}
