import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { fields } from "@/config/fields";

const read = (name: string) => readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), "utf8");

describe("README", () => {
  it("lists exactly the sheet headers the field config requires, in the same order", () => {
    const line = read("README.md")
      .split("\n")
      .find((candidate) => candidate.includes("\t"));
    expect(line?.split("\t")).toEqual(fields.map((field) => field.column));
  });
});

describe(".env.example", () => {
  it("names the variable the build reads, with no value filled in", () => {
    expect(read(".env.example")).toMatch(/^OAUTH_CLIENT_ID=$/m);
  });
});
