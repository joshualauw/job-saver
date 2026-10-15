import { appConfig } from "@/config/app";
import type { JobFieldKey } from "@/config/fields";

import type { FormInputs } from "./form-values";

const STATUS_KEY = "status" satisfies JobFieldKey;
const APPLIED_AT_KEY = "appliedAt" satisfies JobFieldKey;

/** Today's date in the user's local timezone as `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Cross-field rules, run when `changedKey` was edited. Returns the same object when nothing
 * applies. Setting the status to "applied" stamps an empty `appliedAt` with today; an existing
 * date is never overwritten or cleared.
 */
export function applyStatusRules(inputs: FormInputs, changedKey: string | undefined, today: string): FormInputs {
  const becameApplied = changedKey === STATUS_KEY && inputs[STATUS_KEY] === appConfig.appliedStatus;
  const appliedAtEmpty = (inputs[APPLIED_AT_KEY] ?? "").trim() === "";

  if (becameApplied && appliedAtEmpty) return { ...inputs, [APPLIED_AT_KEY]: today };
  return inputs;
}
