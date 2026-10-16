import type { JobFieldKey } from "@/config/fields";
import type { SavedJob } from "@/core/types";

const STATUS_KEY = "status" satisfies JobFieldKey;
const LAST_UPDATED_KEY = "lastUpdatedAt" satisfies JobFieldKey;

/**
 * Decides the final values to write. `lastUpdatedAt` is code-owned: blank for a new row, and for
 * an existing row set to today only when the status changed (otherwise the stored value stays).
 */
export function planSave(
  existing: SavedJob | null,
  values: Readonly<Record<string, unknown>>,
  today: string,
): Record<string, unknown> {
  if (!existing) return { ...values, [LAST_UPDATED_KEY]: null };

  const statusChanged = existing.values[STATUS_KEY] !== values[STATUS_KEY];
  const stored = existing.values[LAST_UPDATED_KEY] ?? null;
  return { ...values, [LAST_UPDATED_KEY]: statusChanged ? today : stored };
}
