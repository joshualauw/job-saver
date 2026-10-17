import { describe, expect, it } from "vitest";

import { fields } from "@/config/fields";

import { MissingColumnsError, SchemaError } from "./errors";
import { asSheetReturns } from "../../tests/helpers/as-sheet-returns";
import { asText, columnIndexOf, fromSheetRow, toSheetCells, toSheetRow } from "./row-mapping";
import type { FieldDef } from "./types";

const header = fields.map((field) => field.column);

const values = {
  company: "Acme",
  jobTitle: "Backend Engineer",
  address: null,
  contractType: "full_time",
  locationType: "remote",
  platform: "Jobstreet",
  jobUrl: "https://id.jobstreet.com/id/job/12345678",
  minYoe: 2,
  skills: ["node.js", "postgres"],
  salaryPeriod: "month",
  salaryCurrency: "IDR",
  minSalary: 8_000_000,
  maxSalary: null,
  summary: "Builds APIs.",
  notes: "BPJS; 9-5 working hours",
  cvFit: "Strong match on the backend stack.",
  preferenceFit: "Yes: Remote work\nNo: Salary above 10M",
  verdict: "very_high",
};

describe("asText", () => {
  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tcmd", "12-14", "3/4", "2024", "TRUE", "Backend Engineer"])(
    "prefixes %j so Sheets stores it as text",
    (text) => {
      expect(asText(text)).toBe(`'${text}`);
    },
  );
});

describe("toSheetRow", () => {
  it("writes values in header order, using enum labels and blanks for null", () => {
    const row = toSheetRow(fields, values, header);
    expect(row).toEqual([
      "'Acme",
      "'Backend Engineer",
      "",
      "Full-time",
      "Remote",
      "'Jobstreet",
      "'https://id.jobstreet.com/id/job/12345678",
      2,
      "'node.js, postgres",
      "Month",
      "'IDR",
      8_000_000,
      "",
      "'Builds APIs.",
      "'BPJS; 9-5 working hours",
      "'Strong match on the backend stack.",
      "'Yes: Remote work\nNo: Salary above 10M",
      "Very high",
    ]);
  });

  it("stores text that Sheets would read as a date, number or boolean as literal text", () => {
    const row = toSheetRow(
      fields,
      { ...values, address: "12-14", notes: "3/4", company: "2024", summary: "TRUE" },
      header,
    );
    expect(row[header.indexOf("Address")]).toBe("'12-14");
    expect(row[header.indexOf("Notes")]).toBe("'3/4");
    expect(row[header.indexOf("Company")]).toBe("'2024");
    expect(row[header.indexOf("Summary")]).toBe("'TRUE");
  });

  it("keeps blank text cells blank rather than writing a bare apostrophe", () => {
    const row = toSheetRow(fields, { ...values, summary: "", notes: null }, header);
    expect(row[header.indexOf("Summary")]).toBe("");
    expect(row[header.indexOf("Notes")]).toBe("");
  });

  it("maps by header name, not position, and leaves unknown columns blank", () => {
    const shuffled = ["Comments", ...[...header].reverse()];
    const row = toSheetRow(fields, values, shuffled);
    expect(row).toHaveLength(shuffled.length);
    expect(row[0]).toBe("");
    expect(row[shuffled.indexOf("Company")]).toBe("'Acme");
    expect(row[shuffled.indexOf("Min Salary")]).toBe(8_000_000);
  });

  it("matches headers ignoring case and surrounding whitespace", () => {
    const sloppy = header.map((name) => ` ${name.toUpperCase()} `);
    expect(toSheetRow(fields, values, sloppy)[0]).toBe("'Acme");
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
    expect(row[header.indexOf("Skills")]).toBe("'node.js, typescript");
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
    expect(() => toSheetRow(fields, { ...values, contractType: "dreaming" }, header)).toThrow(SchemaError);
    expect(() => toSheetRow(fields, { ...values, minSalary: "8jt" }, header)).toThrow(SchemaError);
  });
});

describe("fromSheetRow", () => {
  it("round-trips a row written by toSheetRow", () => {
    const row = asSheetReturns(toSheetRow(fields, values, header));
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

  it("parses formatted numbers", () => {
    const row = Array(header.length).fill("") as (string | number)[];
    row[header.indexOf("Min Salary")] = "8,000,000";
    row[header.indexOf("Max Salary")] = 12_000_000;
    const parsed = fromSheetRow(fields, row, header);
    expect(parsed["minSalary"]).toBe(8_000_000);
    expect(parsed["maxSalary"]).toBe(12_000_000);
  });

  it("returns null for unparseable numbers and unknown enum labels", () => {
    const row = Array(header.length).fill("") as string[];
    row[header.indexOf("Min Salary")] = "negotiable";
    row[header.indexOf("Contract Type")] = "Dreaming";
    const parsed = fromSheetRow(fields, row, header);
    expect(parsed["minSalary"]).toBeNull();
    expect(parsed["contractType"]).toBeNull();
  });

  it("throws MissingColumnsError when the header lacks a configured column", () => {
    expect(() => fromSheetRow(fields, [], ["Company"])).toThrow(MissingColumnsError);
  });
});

// No configured field is a date today, but the mapping supports them.
describe("date columns", () => {
  const dated = [
    { key: "appliedOn", column: "Applied On", label: "Applied on", type: "date", source: "ai", nullable: true },
  ] as const satisfies readonly FieldDef[];
  const datedHeader = ["Applied On"];

  it("writes an ISO date as is and rejects other formats", () => {
    expect(toSheetRow(dated, { appliedOn: "2026-10-15" }, datedHeader)).toEqual(["2026-10-15"]);
    expect(() => toSheetRow(dated, { appliedOn: "15/10/2026" }, datedHeader)).toThrow(SchemaError);
  });

  it("reads Sheets serial dates and returns null for unparseable ones", () => {
    expect(fromSheetRow(dated, asSheetReturns([46_310]), datedHeader)["appliedOn"]).toBe("2026-10-15");
    expect(fromSheetRow(dated, ["last week"], datedHeader)["appliedOn"]).toBeNull();
  });
});

describe("toSheetCells", () => {
  it("returns only the cells the app owns, with their header index", () => {
    const withExtra = ["Comments", ...header];
    const cells = toSheetCells(fields, values, withExtra);

    expect(cells).toHaveLength(fields.length);
    expect(cells.map((cell) => cell.index)).not.toContain(0);
    expect(cells.find((cell) => cell.index === withExtra.indexOf("Company"))?.value).toBe("'Acme");
  });

  it("throws MissingColumnsError like toSheetRow", () => {
    expect(() => toSheetCells(fields, values, ["Company"])).toThrow(MissingColumnsError);
  });
});

describe("columnIndexOf", () => {
  it("finds a field's column by header name, wherever it sits", () => {
    const shuffled = ["Comments", ...[...header].reverse()];
    expect(columnIndexOf(fields, "jobUrl", shuffled)).toBe(shuffled.indexOf("Job URL"));
  });

  it("throws MissingColumnsError when the header lacks a configured column", () => {
    expect(() => columnIndexOf(fields, "jobUrl", ["Job URL"])).toThrow(MissingColumnsError);
  });
});

describe("assessment columns", () => {
  it("keep multi-line text and write the verdict as its label", () => {
    const row = toSheetRow(fields, values, header);
    expect(row[header.indexOf("Preference Fit")]).toBe("'Yes: Remote work\nNo: Salary above 10M");
    expect(row[header.indexOf("Verdict")]).toBe("Very high");
  });

  it("guard assessment text against formula injection like any other text", () => {
    const row = toSheetRow(fields, { ...values, cvFit: "=IMPORTXML(...)" }, header);
    expect(row[header.indexOf("CV Fit")]).toBe("'=IMPORTXML(...)");
  });

  it("read back an unknown verdict label as null", () => {
    const row = asSheetReturns(toSheetRow(fields, values, header));
    row[header.indexOf("Verdict")] = "Excellent";
    expect(fromSheetRow(fields, row, header)["verdict"]).toBeNull();
  });

  it("are required columns: a sheet without them is reported as missing", () => {
    const old = header.filter((name) => !["CV Fit", "Preference Fit", "Verdict"].includes(name));
    expect(() => toSheetRow(fields, values, old)).toThrow(/CV Fit, Preference Fit, Verdict/);
  });
});
