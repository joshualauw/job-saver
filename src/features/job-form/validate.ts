import type { FieldErrors, Resolver } from "react-hook-form";
import type { ZodIssue } from "zod";

import { fields, jobFormSchema } from "@/config/fields";
import type { JobValues } from "@/config/fields";

import { fromFormInputs } from "./form-values";
import type { FormInputs } from "./form-values";

export type ValidationResult =
  | { readonly ok: true; readonly values: JobValues }
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

function messageFor(issue: ZodIssue, key: string, typed: Readonly<Record<string, unknown>>): string {
  const field = fields.find((candidate) => candidate.key === key);
  if (typed[key] === null) return "Required";

  switch (issue.code) {
    case "invalid_type":
      return field?.type === "number" ? "Must be a number" : "Required";
    case "too_small":
      return field?.type === "number" ? "Must be 0 or more" : "Required";
    case "invalid_value":
      return "Pick one of the options";
    case "custom":
      return "Required";
    default:
      return issue.message;
  }
}

/** Validates the form strings with the save-time schema; one message per field. */
export function validateInputs(inputs: FormInputs): ValidationResult {
  const typed = fromFormInputs(inputs);
  const result = jobFormSchema.safeParse(typed);
  if (result.success) return { ok: true, values: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || key in errors) continue;
    errors[key] = messageFor(issue, key, typed);
  }
  return { ok: false, errors };
}

/** react-hook-form resolver; typed values are re-derived with `validateInputs` on submit. */
export const jobFormResolver: Resolver<FormInputs> = (inputs) => {
  const result = validateInputs(inputs);
  if (result.ok) return { values: inputs, errors: {} };

  const errors: FieldErrors<FormInputs> = {};
  for (const [key, message] of Object.entries(result.errors)) {
    errors[key] = { type: "validate", message };
  }
  return { values: {}, errors };
};
