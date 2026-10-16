import { describe, expect, it } from "vitest";

import { isSetupComplete, setupSteps } from "./setup-status";

describe("setup status", () => {
  it("reports both steps open when nothing is configured", () => {
    expect(setupSteps(undefined).map((step) => step.done)).toEqual([false, false]);
    expect(isSetupComplete({})).toBe(false);
  });

  it("marks each step as it is completed", () => {
    expect(setupSteps({ openaiApiKey: "sk-x" }).map((step) => [step.id, step.done])).toEqual([
      ["openai", true],
      ["spreadsheet", false],
    ]);
    expect(isSetupComplete({ openaiApiKey: "sk-x" })).toBe(false);
    expect(isSetupComplete({ spreadsheetId: "sheet" })).toBe(false);
  });

  it("is complete once the key and spreadsheet are both set; model and tab are optional", () => {
    expect(isSetupComplete({ openaiApiKey: "sk-x", spreadsheetId: "sheet" })).toBe(true);
  });
});
