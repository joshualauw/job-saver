import { describe, expect, it } from "vitest";

import { todayIso } from "./today";

describe("todayIso", () => {
  it("formats the local date as YYYY-MM-DD with zero padding", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayIso(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});
