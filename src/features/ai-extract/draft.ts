import { fields } from "@/config/fields";
import type { JobFieldKey, JobValues, LlmJobValues } from "@/config/fields";
import { normalizeList } from "@/core/normalize";
import type { JobSource } from "@/core/types";

/**
 * Proposed values for the form. Scalars may be `null` until the user fills them in; the form
 * schema enforces required fields at save time.
 */
export type JobDraft = {
  [K in keyof JobValues]: K extends "skills" ? string[] : JobValues[K] | null;
};

export interface BuildDraftInput {
  /** Derived from the page URL; `null` when the URL is not usable. */
  readonly source: JobSource | null;
  readonly llm: LlmJobValues;
  /** Status for a new row (an option value of the `status` field). */
  readonly status: JobValues["status"];
  /**
   * Values of the row already in the sheet, when refreshing it. They are the base: the model only
   * replaces AI-sourced fields it actually found a value for, so nothing is blanked and the
   * user's own fields (status, dates) are kept.
   */
  readonly saved?: Readonly<Record<string, unknown>>;
}

export interface BuildDraftResult {
  readonly values: JobDraft;
  /** Required or AI-sourced scalar fields that ended up empty: shown as "not found". */
  readonly missing: readonly JobFieldKey[];
}

const PLATFORM_KEY = "platform" satisfies JobFieldKey;
const JOB_URL_KEY = "jobUrl" satisfies JobFieldKey;
const STATUS_KEY = "status" satisfies JobFieldKey;
const SKILLS_KEY = "skills" satisfies JobFieldKey;
const APPLIED_AT_KEY = "appliedAt" satisfies JobFieldKey;
const LAST_UPDATED_KEY = "lastUpdatedAt" satisfies JobFieldKey;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const AI_KEYS: ReadonlySet<string> = new Set(fields.filter((field) => field.source === "ai").map((field) => field.key));

/**
 * Merges what code knows (platform, clean URL, default status) with what the model returned.
 * Code-owned fields always win, and the model never sets user-owned fields.
 */
export function buildJobDraft({ source, llm, status, saved }: BuildDraftInput): BuildDraftResult {
  const merged: Record<string, unknown> = { ...saved };

  for (const [key, value] of Object.entries({ ...llm, [SKILLS_KEY]: normalizeList(llm.skills) })) {
    if (!AI_KEYS.has(key)) continue;
    const empty = isBlank(value) || (Array.isArray(value) && value.length === 0);
    if (!saved || !empty) merged[key] = value;
  }

  merged[PLATFORM_KEY] = source?.platform ?? null;
  merged[JOB_URL_KEY] = source?.jobUrl ?? null;
  if (saved) {
    if (isBlank(merged[STATUS_KEY])) merged[STATUS_KEY] = status;
    if (!Array.isArray(merged[SKILLS_KEY])) merged[SKILLS_KEY] = [];
  } else {
    Object.assign(merged, { [STATUS_KEY]: status, [APPLIED_AT_KEY]: null, [LAST_UPDATED_KEY]: null });
  }

  const missing: JobFieldKey[] = [];
  for (const field of fields) {
    if (field.type === "stringList") continue;
    if (isBlank(merged[field.key])) {
      merged[field.key] = null;
      const required = "required" in field && field.required;
      if (field.source === "ai" || required) missing.push(field.key);
    }
  }

  // Built from the field list above, so it has exactly the keys `JobDraft` describes.
  return { values: merged as JobDraft, missing };
}
