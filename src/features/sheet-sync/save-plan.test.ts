import { describe, expect, it } from "vitest";

import type { SavedJob } from "@/core/types";

import { planSave } from "./save-plan";

const TODAY = "2026-10-16";
const values = { company: "Ryvo", status: "applied", lastUpdatedAt: null };

function savedWith(status: string, lastUpdatedAt: string | null): SavedJob {
  return { row: 3, values: { status, lastUpdatedAt } };
}

describe("planSave", () => {
  it("leaves lastUpdatedAt blank for a new row, whatever the form held", () => {
    expect(planSave(null, { ...values, lastUpdatedAt: "2020-01-01" }, TODAY)["lastUpdatedAt"]).toBeNull();
  });

  it("stamps today when an existing row's status changed", () => {
    const planned = planSave(savedWith("saved", null), values, TODAY);
    expect(planned["lastUpdatedAt"]).toBe(TODAY);
  });

  it("keeps the stored date when the status is unchanged", () => {
    const planned = planSave(savedWith("applied", "2026-10-01"), values, TODAY);
    expect(planned["lastUpdatedAt"]).toBe("2026-10-01");
  });

  it("keeps a blank stored date blank when the status is unchanged", () => {
    expect(planSave(savedWith("applied", null), values, TODAY)["lastUpdatedAt"]).toBeNull();
  });

  it("does not mutate its input and leaves other values alone", () => {
    const input = { ...values };
    const planned = planSave(savedWith("saved", null), input, TODAY);
    expect(input["lastUpdatedAt"]).toBeNull();
    expect(planned["company"]).toBe("Ryvo");
  });
});
