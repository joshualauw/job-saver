import { fields } from "@/config/fields";
import type { JobFieldKey, JobValues, LlmJobValues } from "@/config/fields";
import { newJobId } from "@/core/job-id";
import { normalizeList } from "@/core/normalize";

/**
 * Proposed values for the form. Scalars may be `null` until the user fills them in; the form
 * schema enforces required fields at save time.
 */
export type JobDraft = {
  [K in keyof JobValues]: K extends "skills" ? string[] : JobValues[K] | null;
};

export interface BuildDraftInput {
  readonly llm: LlmJobValues;
  /** Injectable for tests; defaults to a random ID. */
  readonly newId?: () => string;
}

export interface BuildDraftResult {
  readonly values: JobDraft;
  /** AI-sourced scalar fields that ended up empty: shown as "not found". */
  readonly missing: readonly JobFieldKey[];
}

const JOB_ID_KEY = "jobId" satisfies JobFieldKey;
const SKILLS_KEY = "skills" satisfies JobFieldKey;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const AI_KEYS: ReadonlySet<string> = new Set(fields.filter((field) => field.source === "ai").map((field) => field.key));

/**
 * Merges what code knows (a fresh job ID) with what the model returned. Code-owned fields
 * always win, and the model never sets them. Platform and job URL are the user's to fill in.
 */
export function buildJobDraft({ llm, newId = newJobId }: BuildDraftInput): BuildDraftResult {
  const merged: Record<string, unknown> = {};

  for (const [key, value] of Object.entries({ ...llm, [SKILLS_KEY]: normalizeList(llm.skills) })) {
    if (AI_KEYS.has(key)) merged[key] = value;
  }

  merged[JOB_ID_KEY] = newId();

  const missing: JobFieldKey[] = [];
  for (const field of fields) {
    if (field.type === "stringList") continue;
    if (isBlank(merged[field.key])) {
      merged[field.key] = null;
      if (field.source === "ai") missing.push(field.key);
    }
  }

  // Built from the field list above, so it has exactly the keys `JobDraft` describes.
  return { values: merged as JobDraft, missing };
}
