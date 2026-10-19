import { describe, expect, it } from "vitest";

import type { StepState } from "@/core/types";

import { applyProgress } from "./analyze-progress";

describe("applyProgress", () => {
  it("starts every planned step as pending", () => {
    expect(applyProgress([], { kind: "plan", steps: ["reading", "filling"] })).toEqual([
      { step: "reading", status: "pending" },
      { step: "filling", status: "pending" },
    ]);
  });

  it("marks only the named step as running, then done", () => {
    const planned = applyProgress([], { kind: "plan", steps: ["filling", "checking"] });
    const started = applyProgress(planned, { kind: "start", step: "checking" });
    expect(started.map((state) => state.status)).toEqual(["pending", "running"]);

    const done = applyProgress(started, { kind: "done", step: "checking" });
    expect(done.map((state) => state.status)).toEqual(["pending", "done"]);
  });

  it("lets two steps run at the same time and finish in either order", () => {
    let steps: readonly StepState[] = applyProgress([], { kind: "plan", steps: ["filling", "checking"] });
    steps = applyProgress(steps, { kind: "start", step: "filling" });
    steps = applyProgress(steps, { kind: "start", step: "checking" });
    steps = applyProgress(steps, { kind: "done", step: "checking" });
    expect(steps.map((state) => state.status)).toEqual(["running", "done"]);
  });

  it("ignores a step that was not planned", () => {
    const planned = applyProgress([], { kind: "plan", steps: ["filling"] });
    expect(applyProgress(planned, { kind: "start", step: "reading" })).toEqual(planned);
  });
});
