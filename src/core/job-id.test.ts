import { describe, expect, it } from "vitest";

import { newJobId } from "./job-id";

describe("newJobId", () => {
  it("is 12 lowercase letters and digits", () => {
    expect(newJobId()).toMatch(/^[a-z0-9]{12}$/);
  });

  it("does not repeat across many calls", () => {
    const ids = new Set(Array.from({ length: 2_000 }, newJobId));
    expect(ids.size).toBe(2_000);
  });
});
