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
}

export interface BuildDraftResult {
  readonly values: JobDraft;
  /** Required or AI-sourced scalar fields that ended up empty: shown as "not found". */
  readonly missing: readonly JobFieldKey[];
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * Merges what code knows (platform, clean URL, default status) with what the model returned.
 * Code-owned fields always win, and the model never sets user-owned fields.
 */
export function buildJobDraft({ source, llm, status }: BuildDraftInput): BuildDraftResult {
  const merged: Record<string, unknown> = {
    ...llm,
    skills: normalizeList(llm.skills),
    platform: source?.platform ?? null,
    jobUrl: source?.jobUrl ?? null,
    status,
    appliedAt: null,
    lastUpdatedAt: null,
  };

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
