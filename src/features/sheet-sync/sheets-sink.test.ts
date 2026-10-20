import { describe, expect, it, vi } from "vitest";

import { fields, sheetColumns } from "@/config/fields";
import { MissingColumnsError, SchemaError, UnexpectedError } from "@/core/errors";
import { toSheetRow } from "@/core/row-mapping";
import { asSheetReturns } from "../../../tests/helpers/as-sheet-returns";

import { columnLetter } from "./a1-notation";
import type { SheetsClient } from "./sheets-client";
import { createSheetsSink } from "./sheets-sink";

const URL_A = "https://id.jobstreet.com/id/job/1";
const ID_A = "aaaaaaaaaaaa";
const ID_B = "bbbbbbbbbbbb";

// The sheet has every configured column plus one the user added themselves.
const header = [...sheetColumns, "My Comments"];
const col = (name: string) => header.indexOf(name);

function values(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    company: "Ryvo",
    jobTitle: "Senior Full-Stack Developer",
    address: null,
    contractType: "full_time",
    locationType: "onsite",
    source: "Jobstreet",
    sourceUrl: URL_A,
    jobId: ID_A,
    minYoe: null,
    skills: ["node.js"],
    salaryPeriod: "hour",
    salaryCurrency: "IDR",
    minSalary: 70_000,
    maxSalary: null,
    summary: "Builds software.",
    notes: null,
    ...overrides,
  };
}

function rowFor(overrides: Record<string, unknown> = {}, comment = "keep me") {
  const row = asSheetReturns(toSheetRow(fields, values(overrides), header));
  row[col("My Comments")] = comment;
  return row;
}

function fakeClient(tabValues: unknown[][] | undefined, appendResponse: unknown = {}) {
  const get = vi.fn().mockResolvedValue({ values: tabValues });
  const post = vi.fn().mockResolvedValue(appendResponse);
  const client = { get, post } as unknown as SheetsClient;
  return { sink: createSheetsSink({ tab: "Jobs", client }), get, post };
}

describe("sheets sink: list", () => {
  it("reads the whole tab unformatted and lists the jobs that have an ID, in sheet order", async () => {
    const { sink, get } = fakeClient([
      header,
      rowFor({ jobId: ID_B, company: "Acme", jobTitle: "Engineer", source: "LinkedIn" }),
      rowFor({ jobId: "" }),
      rowFor({ jobId: ID_A, source: null }),
    ]);

    const jobs = await sink.list();

    expect(get.mock.calls[0]?.[0]).toBe(
      `values/${encodeURIComponent("'Jobs'")}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
    );
    expect(jobs).toEqual([
      { id: ID_B, company: "Acme", jobTitle: "Engineer", source: "LinkedIn" },
      { id: ID_A, company: "Ryvo", jobTitle: "Senior Full-Stack Developer", source: null },
    ]);
  });

  it("returns nothing for a tab with only a header", async () => {
    expect(await fakeClient([header]).sink.list()).toEqual([]);
  });

  it("explains missing header columns", async () => {
    const short = header.filter((name) => name !== "Job ID");
    await expect(fakeClient([short, rowFor()]).sink.list()).rejects.toBeInstanceOf(MissingColumnsError);
  });
});

type BatchBody = { valueInputOption: string; data: { range: string; values: unknown[][] }[] };

function cellWritten(body: BatchBody, column: string, row: number): unknown {
  return body.data.find((entry) => entry.range === `'Jobs'!${columnLetter(col(column))}${row}`)?.values[0]?.[0];
}

describe("sheets sink: save a new job", () => {
  it("writes into the row after the last job, so that row keeps its prepared formatting", async () => {
    const { sink, post } = fakeClient([header, rowFor({ jobId: ID_B })]);

    const result = await sink.save(values());

    expect(result).toEqual({ action: "created", row: 3 });
    expect(post).toHaveBeenCalledOnce();
    const [path, body] = post.mock.calls[0] as [string, BatchBody];
    expect(path).toBe("values:batchUpdate");
    expect(body.valueInputOption).toBe("USER_ENTERED");
    expect(cellWritten(body, "Company", 3)).toBe("'Ryvo");
    expect(cellWritten(body, "Contract Type", 3)).toBe("Full-time");
  });

  it("uses row 2 on a tab with only a header", async () => {
    const { sink } = fakeClient([header]);
    expect(await sink.save(values())).toEqual({ action: "created", row: 2 });
  });

  it("never writes to columns the app does not own", async () => {
    const { sink, post } = fakeClient([header]);
    await sink.save(values());

    const body = post.mock.calls[0]?.[1] as BatchBody;
    expect(body.data).toHaveLength(sheetColumns.length);
    expect(body.data.map((entry) => entry.range)).not.toContain(`'Jobs'!${columnLetter(col("My Comments"))}2`);
  });

  it("reuses a gap left by a deleted job instead of going to the end", async () => {
    const blank: unknown[] = [];
    const { sink } = fakeClient([header, rowFor({ jobId: ID_B }), blank, rowFor({ jobId: "cccccccccccc" })]);
    expect((await sink.save(values())).row).toBe(3);
  });

  it("treats a row with data only in a user-added column as free, since the app owns none of it", async () => {
    const userOnly = header.map((name) => (name === "My Comments" ? "note" : ""));
    const { sink } = fakeClient([header, userOnly]);
    expect((await sink.save(values())).row).toBe(2);
  });

  it("guards formula-like text before it reaches the sheet", async () => {
    const { sink, post } = fakeClient([header]);
    await sink.save(values({ summary: "=HYPERLINK(1)" }));
    expect(cellWritten(post.mock.calls[0]?.[1] as BatchBody, "Summary", 2)).toBe("'=HYPERLINK(1)");
  });

  it("falls back to appending when the next row is outside the sheet's grid", async () => {
    const { sink, post } = fakeClient([header], { updates: { updatedRange: "Jobs!A1001:S1001" } });
    post.mockRejectedValueOnce(
      new UnexpectedError("Google Sheets rejected the request: Range ('Jobs'!A2) exceeds grid limits. Max rows: 1"),
    );

    const result = await sink.save(values());

    expect(result).toEqual({ action: "created", row: 1001 });
    const [path, body] = post.mock.calls[1] as [string, { values: unknown[][] }];
    expect(path).toBe(
      `values/${encodeURIComponent("'Jobs'!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    );
    expect(body.values[0]).toHaveLength(header.length);
  });

  it("does not hide other write failures behind the append fallback", async () => {
    const { sink, post } = fakeClient([header]);
    post.mockRejectedValueOnce(new UnexpectedError("Google Sheets rejected the request: something else"));
    await expect(sink.save(values())).rejects.toThrow("something else");
    expect(post).toHaveBeenCalledOnce();
  });
});

describe("sheets sink: save over an existing job", () => {
  it("finds the job by its ID even when its URL differs, so a job can change source", async () => {
    const { sink } = fakeClient([header, rowFor({ jobId: ID_B }), rowFor({ sourceUrl: "https://other.example/job" })]);
    expect(await sink.save(values({ sourceUrl: null }))).toEqual({ action: "updated", row: 3 });
  });

  it("updates only the cells the app owns, so user columns are untouched", async () => {
    const { sink, post } = fakeClient([header, rowFor({ jobId: ID_B }), rowFor({ contractType: "contract" })]);

    const result = await sink.save(values({ contractType: "part_time" }));

    expect(result).toEqual({ action: "updated", row: 3 });
    const [path, body] = post.mock.calls[0] as [
      string,
      { valueInputOption: string; data: { range: string; values: unknown[][] }[] },
    ];
    expect(path).toBe("values:batchUpdate");
    expect(body.valueInputOption).toBe("USER_ENTERED");

    const ranges = body.data.map((entry) => entry.range);
    expect(ranges).toContain(`'Jobs'!${columnLetter(col("Company"))}3`);
    expect(ranges).not.toContain(`'Jobs'!${columnLetter(col("My Comments"))}3`);
    expect(body.data).toHaveLength(sheetColumns.length);
  });
});

describe("sheets sink: validation", () => {
  it("requires a job ID to save", async () => {
    const { sink, post } = fakeClient([header]);
    await expect(sink.save(values({ jobId: "" }))).rejects.toBeInstanceOf(SchemaError);
    expect(post).not.toHaveBeenCalled();
  });

  it("fails before writing anything when a configured column is missing", async () => {
    const short = header.filter((name) => name !== "Skills");
    const { sink, post } = fakeClient([short]);
    await expect(sink.save(values())).rejects.toBeInstanceOf(MissingColumnsError);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("sheets sink: verify", () => {
  it("reports how many configured columns the header has", async () => {
    const { sink, get } = fakeClient([header]);
    await expect(sink.verify()).resolves.toEqual({ columns: sheetColumns.length });
    expect(get).toHaveBeenCalledOnce();
  });

  it("names every missing header", async () => {
    const short = header.filter((name) => name !== "Notes" && name !== "Skills");
    const error = await fakeClient([short])
      .sink.verify()
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MissingColumnsError);
    expect((error as MissingColumnsError).columns).toEqual(["Skills", "Notes"]);
  });

  it("treats an empty tab as missing all columns", async () => {
    await expect(fakeClient(undefined).sink.verify()).rejects.toBeInstanceOf(MissingColumnsError);
  });
});

describe("sheets sink: extension-only fields", () => {
  it("never writes the preference fit to the sheet", async () => {
    const { sink, post } = fakeClient([header]);
    await sink.save(values({ preferenceFit: "Yes: Remote work" }));

    const body = post.mock.calls[0]?.[1] as BatchBody;
    expect(JSON.stringify(body)).not.toContain("Remote work");
    expect(body.data).toHaveLength(sheetColumns.length);
  });

  it("works with a sheet that has no Preference Fit column", async () => {
    const { sink } = fakeClient([header]);
    await expect(sink.save(values({ preferenceFit: "Yes: Remote work" }))).resolves.toEqual({
      action: "created",
      row: 2,
    });
  });

  it("leaves an old Preference Fit column, and what it holds, untouched when a job is updated", async () => {
    const oldHeader = [...header, "Preference Fit"];
    const { sink, post } = fakeClient([oldHeader, [...rowFor(), "Yes: old value"]]);

    await expect(sink.save(values({ preferenceFit: "No: new value" }))).resolves.toEqual({
      action: "updated",
      row: 2,
    });

    const body = post.mock.calls[0]?.[1] as BatchBody;
    const oldColumnRange = `'Jobs'!${columnLetter(oldHeader.indexOf("Preference Fit"))}2`;
    expect(body.data.map((entry) => entry.range)).not.toContain(oldColumnRange);
    expect(JSON.stringify(body)).not.toContain("new value");
  });
});
