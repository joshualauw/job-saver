import { describe, expect, it } from "vitest";

import { fields } from "@/config/fields";

import { MissingColumnsError, SchemaError } from "./errors";
import { fromSheetRow, guardFormula, toSheetRow } from "./row-mapping";

const header = fields.map((field) => field.column);

const values = {
  company: "Acme",
  jobTitle: "Backend Engineer",
  address: null,
  contractType: "full_time",
  locationType: "remote",
  platform: "Jobstreet",
  jobUrl: "https://id.jobstreet.com/id/job/12345678",
  status: "applied",
  appliedAt: "2026-10-15",
  lastUpdatedAt: null,
  minYoe: 2,
  skills: ["node.js", "postgres"],
  salaryPeriod: "month",
  salaryCurrency: "IDR",
  minSalary: 8_000_000,
  maxSalary: null,
  summary: "Builds APIs.",
};

describe("guardFormula", () => {
  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tcmd"])("prefixes %j", (text) => {
    expect(guardFormula(text)).toBe(`'${text}`);
  });

  it("leaves safe text untouched", () => {
    expect(guardFormula("Backend Engineer")).toBe("Backend Engineer");
  });
});

describe("toSheetRow", () => {
  it("writes values in header order, using enum labels and blanks for null", () => {
    const row = toSheetRow(fields, values, header);
    expect(row).toEqual([
      "Acme",
      "Backend Engineer",
      "",
      "Full-time",
      "Remote",
      "Jobstreet",
      "https://id.jobstreet.com/id/job/12345678",
      "Applied",
      "2026-10-15",
      "",
      2,
      "node.js, postgres",
      "Month",
      "IDR",
      8_000_000,
      "",
      "Builds APIs.",
    ]);
  });

  it("maps by header name, not position, and leaves unknown columns blank", () => {
    const shuffled = ["Notes", ...[...header].reverse()];
    const row = toSheetRow(fields, values, shuffled);
    expect(row).toHaveLength(shuffled.length);
    expect(row[0]).toBe("");
    expect(row[shuffled.indexOf("Company")]).toBe("Acme");
    expect(row[shuffled.indexOf("Min Salary")]).toBe(8_000_000);
  });

  it("matches headers ignoring case and surrounding whitespace", () => {
    const sloppy = header.map((name) => ` ${name.toUpperCase()} `);
    expect(toSheetRow(fields, values, sloppy)[0]).toBe("Acme");
  });

  it("throws MissingColumnsError naming every missing header", () => {
    const partial = header.filter((name) => name !== "Company" && name !== "Summary");
    try {
      toSheetRow(fields, values, partial);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingColumnsError);
      expect((error as MissingColumnsError).columns).toEqual(["Company", "Summary"]);
    }
  });

  it("guards formula-like text from page content", () => {
    const row = toSheetRow(fields, { ...values, summary: '=HYPERLINK("http://evil")' }, header);
    expect(row[header.indexOf("Summary")]).toBe('\'=HYPERLINK("http://evil")');
  });

  it("writes skills as one normalised, comma-separated cell", () => {
    const row = toSheetRow(fields, { ...values, skills: ["Node.js ", "TypeScript", "node.js", ""] }, header);
    expect(row[header.indexOf("Skills")]).toBe("node.js, typescript");
  });

  it("writes an empty skills list as a blank cell", () => {
    expect(toSheetRow(fields, { ...values, skills: [] }, header)[header.indexOf("Skills")]).toBe("");
  });

  it("guards formula-like skill text", () => {
    const row = toSheetRow(fields, { ...values, skills: ["=cmd"] }, header);
    expect(row[header.indexOf("Skills")]).toBe("'=cmd");
  });

  it("rejects values that cannot be represented", () => {
    expect(() => toSheetRow(fields, { ...values, skills: "node.js" }, header)).toThrow(SchemaError);
    expect(() => toSheetRow(fields, { ...values, skills: [1] }, header)).toThrow(SchemaError);
    expect(() => toSheetRow(fields, { ...values, status: "dreaming" }, header)).toThrow(SchemaError);
    expect(() => toSheetRow(fields, { ...values, minSalary: "8jt" }, header)).toThrow(SchemaError);
    expect(() => toSheetRow(fields, { ...values, appliedAt: "15/10/2026" }, header)).toThrow(SchemaError);
  });
});

describe("fromSheetRow", () => {
  it("round-trips a row written by toSheetRow", () => {
    const row = toSheetRow(fields, values, header);
    expect(fromSheetRow(fields, row, header)).toEqual(values);
  });

  it("treats short rows (trailing empty cells omitted by Sheets) as null / empty list", () => {
    const parsed = fromSheetRow(fields, ["Acme", "Backend Engineer"], header);
    expect(parsed["company"]).toBe("Acme");
    expect(parsed["summary"]).toBeNull();
    expect(parsed["skills"]).toEqual([]);
  });

  it("splits and normalises a hand-edited skills cell", () => {
    const row = Array(header.length).fill("") as string[];
    row[header.indexOf("Skills")] = "Node.js,  Postgres ,node.js, ";
    expect(fromSheetRow(fields, row, header)["skills"]).toEqual(["node.js", "postgres"]);
  });

  it("parses formatted numbers and Sheets serial dates", () => {
    const row = Array(header.length).fill("") as (string | number)[];
    row[header.indexOf("Min Salary")] = "8,000,000";
    row[header.indexOf("Max Salary")] = 12_000_000;
    row[header.indexOf("Applied At")] = 46_310; // 2026-10-15
    const parsed = fromSheetRow(fields, row, header);
    expect(parsed["minSalary"]).toBe(8_000_000);
    expect(parsed["maxSalary"]).toBe(12_000_000);
    expect(parsed["appliedAt"]).toBe("2026-10-15");
  });

  it("returns null for unparseable numbers, dates, and unknown enum labels", () => {
    const row = Array(header.length).fill("") as string[];
    row[header.indexOf("Min Salary")] = "negotiable";
    row[header.indexOf("Applied At")] = "last week";
    row[header.indexOf("Status")] = "Dreaming";
    const parsed = fromSheetRow(fields, row, header);
    expect(parsed["minSalary"]).toBeNull();
    expect(parsed["appliedAt"]).toBeNull();
    expect(parsed["status"]).toBeNull();
  });

  it("throws MissingColumnsError when the header lacks a configured column", () => {
    expect(() => fromSheetRow(fields, [], ["Company"])).toThrow(MissingColumnsError);
  });
});
