import { describe, expect, it } from "vitest";

import { joinList, normalizeList, splitList } from "./normalize";

describe("normalizeList", () => {
  it("lowercases, trims, collapses whitespace, drops empties and duplicates", () => {
    expect(normalizeList(["Node.js", "  TypeScript ", "type   script", "", "node.js", "  "])).toEqual([
      "node.js",
      "typescript",
      "type script",
    ]);
  });

  it("keeps first-seen order", () => {
    expect(normalizeList(["b", "a", "B"])).toEqual(["b", "a"]);
  });

  it("returns an empty array for no usable input", () => {
    expect(normalizeList([])).toEqual([]);
    expect(normalizeList(["", " "])).toEqual([]);
  });
});

describe("joinList / splitList", () => {
  it("joins with a comma and space", () => {
    expect(joinList(["Node.js", "Postgres"])).toBe("node.js, postgres");
  });

  it("splits tolerant of spacing and round-trips", () => {
    expect(splitList("node.js,postgres ,  java")).toEqual(["node.js", "postgres", "java"]);
    expect(splitList(joinList(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("splits an empty string to an empty list", () => {
    expect(splitList("")).toEqual([]);
  });
});
