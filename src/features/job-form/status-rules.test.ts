import { describe, expect, it } from "vitest";

import { appConfig } from "@/config/app";
import { fields } from "@/config/fields";

import type { FormInputs } from "./form-values";
import { applyStatusRules, todayIso } from "./status-rules";

const base: FormInputs = { status: "saved", appliedAt: "" };

describe("applyStatusRules", () => {
  it("stamps today when the status becomes Applied and the date is empty", () => {
    const next = applyStatusRules({ ...base, status: appConfig.appliedStatus }, "status", "2026-10-16");
    expect(next["appliedAt"]).toBe("2026-10-16");
  });

  it("never overwrites an existing date", () => {
    const inputs = { status: appConfig.appliedStatus, appliedAt: "2026-09-01" };
    expect(applyStatusRules(inputs, "status", "2026-10-16")).toBe(inputs);
  });

  it("does nothing for other statuses or other edited fields", () => {
    const interviewing = { ...base, status: "interviewing" };
    expect(applyStatusRules(interviewing, "status", "2026-10-16")).toBe(interviewing);

    const applied = { ...base, status: appConfig.appliedStatus };
    expect(applyStatusRules(applied, "company", "2026-10-16")).toBe(applied);
    expect(applyStatusRules(applied, undefined, "2026-10-16")).toBe(applied);
  });

  it("does not clear the date when moving away from Applied", () => {
    const inputs = { status: "offer", appliedAt: "2026-10-16" };
    expect(applyStatusRules(inputs, "status", "2026-10-17")).toBe(inputs);
  });

  it("uses an applied status that exists in the status options", () => {
    const status = fields.find((field) => field.key === "status");
    const values = status && "options" in status ? status.options.map((option) => option.value) : [];
    expect(values).toContain(appConfig.appliedStatus);
  });
});

describe("todayIso", () => {
  it("formats the local date as YYYY-MM-DD with zero padding", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayIso(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});
