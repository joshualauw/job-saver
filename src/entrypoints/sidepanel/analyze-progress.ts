import type { AnalyzeProgress, StepState } from "@/core/types";

/** Folds one progress report into the checklist shown while analyzing. */
export function applyProgress(steps: readonly StepState[], event: AnalyzeProgress): readonly StepState[] {
  if (event.kind === "plan") return event.steps.map((step) => ({ step, status: "pending" }));
  const status = event.kind === "start" ? "running" : "done";
  return steps.map((state) => (state.step === event.step ? { ...state, status } : state));
}
