import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { fields } from "@/config/fields";

import { readZip } from "./helpers/read-zip";

const files = readZip(fileURLToPath(new URL("../templates/job-tracker-template.xlsx", import.meta.url)));
const part = (name: string): string => {
  const content = files.get(name);
  if (content === undefined) throw new Error(`${name} is missing from the template`);
  return content;
};

function sharedStrings(): string[] {
  return [...part("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    (match[1] ?? "").replace(/<[^>]+>/g, ""),
  );
}

describe("sheet template", () => {
  it("has exactly the headers the field config requires, spelled the same", () => {
    expect([...sharedStrings()].sort()).toEqual(fields.map((field) => field.column).sort());
  });

  it("names its table columns after those headers", () => {
    const tableColumns = [...part("xl/tables/table1.xml").matchAll(/<tableColumn [^>]*name="([^"]*)"/g)].map(
      (match) => match[1],
    );
    expect([...tableColumns].sort()).toEqual([...sharedStrings()].sort());
  });

  it("has a tab named Jobs and no data rows", () => {
    expect(part("xl/workbook.xml")).toMatch(/<sheet name="Jobs"/);
    // Text cells are shared strings; only the 21 header strings may exist, so there is no job data.
    expect(sharedStrings()).toHaveLength(fields.length);
  });

  it("carries no personal metadata", () => {
    const text = [...files.values()].join("\n");
    expect(text).not.toMatch(/lastModifiedBy|<dc:creator>|absPath/);
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
