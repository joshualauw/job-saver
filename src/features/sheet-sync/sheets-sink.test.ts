import { describe, expect, it, vi } from "vitest";

import { fields } from "@/config/fields";
import { MissingColumnsError, SchemaError, UnexpectedError } from "@/core/errors";
import { toSheetRow } from "@/core/row-mapping";

import { columnLetter } from "./a1-notation";
import type { SheetsClient } from "./sheets-client";
import { createSheetsSink } from "./sheets-sink";

const URL_A = "https://id.jobstreet.com/id/job/1";
const URL_B = "https://id.jobstreet.com/id/job/2";
const TODAY = "2026-10-16";

// The sheet has every configured column plus one the user added themselves.
const header = [...fields.map((field) => field.column), "My Comments"];
const col = (name: string) => header.indexOf(name);

function values(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    company: "Ryvo",
    jobTitle: "Senior Full-Stack Developer",
    address: null,
    contractType: "full_time",
    locationType: "onsite",
    platform: "Jobstreet",
    jobUrl: URL_A,
    status: "applied",
    appliedAt: "2026-10-10",
    lastUpdatedAt: null,
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
  const row = toSheetRow(fields, values(overrides), header);
  row[col("My Comments")] = comment;
  return row;
}

function fakeClient(tabValues: unknown[][] | undefined, appendResponse: unknown = {}) {
  const get = vi.fn().mockResolvedValue({ values: tabValues });
  const post = vi.fn().mockResolvedValue(appendResponse);
  const client = { get, post } as unknown as SheetsClient;
  return { sink: createSheetsSink({ tab: "Jobs", client }), get, post };
}

describe("sheets sink: find", () => {
  it("reads the whole tab unformatted and returns the matching row with its decoded values", async () => {
    const { sink, get } = fakeClient([header, rowFor({ jobUrl: URL_B }), rowFor({ status: "interviewing" })]);

    const found = await sink.find(URL_A);

    expect(get.mock.calls[0]?.[0]).toBe(
      `values/${encodeURIComponent("'Jobs'")}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
    );
    expect(found?.row).toBe(3);
    expect(found?.values["status"]).toBe("interviewing");
    expect(found?.values["skills"]).toEqual(["node.js"]);
  });

  it("returns null when the URL is not in the sheet or the tab is empty", async () => {
    expect(await fakeClient([header, rowFor({ jobUrl: URL_B })]).sink.find(URL_A)).toBeNull();
    expect(await fakeClient([header]).sink.find(URL_A)).toBeNull();
  });

  it("explains missing header columns", async () => {
    const short = header.filter((name) => name !== "Notes");
    await expect(fakeClient([short, rowFor()]).sink.find(URL_A)).rejects.toBeInstanceOf(MissingColumnsError);
  });
});

type BatchBody = { valueInputOption: string; data: { range: string; values: unknown[][] }[] };

function cellWritten(body: BatchBody, column: string, row: number): unknown {
  return body.data.find((entry) => entry.range === `'Jobs'!${columnLetter(col(column))}${row}`)?.values[0]?.[0];
}

describe("sheets sink: save a new job", () => {
  it("writes into the row after the last job, so that row keeps its prepared formatting", async () => {
    const { sink, post } = fakeClient([header, rowFor({ jobUrl: URL_B })]);

    const result = await sink.save(values({ lastUpdatedAt: "2020-01-01" }), TODAY);

    expect(result).toEqual({ action: "created", row: 3 });
    expect(post).toHaveBeenCalledOnce();
    const [path, body] = post.mock.calls[0] as [string, BatchBody];
    expect(path).toBe("values:batchUpdate");
    expect(body.valueInputOption).toBe("USER_ENTERED");
    expect(cellWritten(body, "Company", 3)).toBe("Ryvo");
    expect(cellWritten(body, "Status", 3)).toBe("Applied");
    expect(cellWritten(body, "Last Updated At", 3)).toBe("");
  });

  it("uses row 2 on a tab with only a header", async () => {
    const { sink } = fakeClient([header]);
    expect(await sink.save(values(), TODAY)).toEqual({ action: "created", row: 2 });
  });

  it("never writes to columns the app does not own", async () => {
    const { sink, post } = fakeClient([header]);
    await sink.save(values(), TODAY);

    const body = post.mock.calls[0]?.[1] as BatchBody;
    expect(body.data).toHaveLength(fields.length);
    expect(body.data.map((entry) => entry.range)).not.toContain(`'Jobs'!${columnLetter(col("My Comments"))}2`);
  });

  it("reuses a gap left by a deleted job instead of going to the end", async () => {
    const blank: unknown[] = [];
    const { sink } = fakeClient([header, rowFor({ jobUrl: URL_B }), blank, rowFor({ jobUrl: "https://x/3" })]);
    expect((await sink.save(values(), TODAY)).row).toBe(3);
  });

  it("treats a row with data only in a user-added column as free, since the app owns none of it", async () => {
    const userOnly = header.map((name) => (name === "My Comments" ? "note" : ""));
    const { sink } = fakeClient([header, userOnly]);
    expect((await sink.save(values(), TODAY)).row).toBe(2);
  });

  it("guards formula-like text before it reaches the sheet", async () => {
    const { sink, post } = fakeClient([header]);
    await sink.save(values({ summary: "=HYPERLINK(1)" }), TODAY);
    expect(cellWritten(post.mock.calls[0]?.[1] as BatchBody, "Summary", 2)).toBe("'=HYPERLINK(1)");
  });

  it("falls back to appending when the next row is outside the sheet's grid", async () => {
    const { sink, post } = fakeClient([header], { updates: { updatedRange: "Jobs!A1001:S1001" } });
    post.mockRejectedValueOnce(
      new UnexpectedError("Google Sheets rejected the request: Range ('Jobs'!A2) exceeds grid limits. Max rows: 1"),
    );

    const result = await sink.save(values(), TODAY);

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
    await expect(sink.save(values(), TODAY)).rejects.toThrow("something else");
    expect(post).toHaveBeenCalledOnce();
  });
});

describe("sheets sink: save over an existing job", () => {
  it("updates only the cells the app owns, so user columns are untouched", async () => {
    const { sink, post } = fakeClient([header, rowFor({ jobUrl: URL_B }), rowFor({ status: "saved" })]);

    const result = await sink.save(values({ status: "applied" }), TODAY);

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
    expect(body.data).toHaveLength(fields.length);
  });

  it("stamps lastUpdatedAt with today when the status changed", async () => {
    const { sink, post } = fakeClient([header, rowFor({ status: "saved" })]);
    await sink.save(values({ status: "applied" }), TODAY);

    const data = (post.mock.calls[0]?.[1] as { data: { range: string; values: unknown[][] }[] }).data;
    const entry = data.find((item) => item.range === `'Jobs'!${columnLetter(col("Last Updated At"))}2`);
    expect(entry?.values).toEqual([[TODAY]]);
  });

  it("keeps the stored lastUpdatedAt when the status did not change", async () => {
    const { sink, post } = fakeClient([header, rowFor({ status: "applied", lastUpdatedAt: "2026-10-01" })]);
    await sink.save(values({ status: "applied" }), TODAY);

    const data = (post.mock.calls[0]?.[1] as { data: { range: string; values: unknown[][] }[] }).data;
    const entry = data.find((item) => item.range === `'Jobs'!${columnLetter(col("Last Updated At"))}2`);
    expect(entry?.values).toEqual([["2026-10-01"]]);
  });
});

describe("sheets sink: validation", () => {
  it("requires a job URL to save", async () => {
    const { sink, post } = fakeClient([header]);
    await expect(sink.save(values({ jobUrl: "" }), TODAY)).rejects.toBeInstanceOf(SchemaError);
    expect(post).not.toHaveBeenCalled();
  });

  it("fails before writing anything when a configured column is missing", async () => {
    const short = header.filter((name) => name !== "Skills");
    const { sink, post } = fakeClient([short]);
    await expect(sink.save(values(), TODAY)).rejects.toBeInstanceOf(MissingColumnsError);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("sheets sink: verify", () => {
  it("reports how many configured columns the header has", async () => {
    const { sink, get } = fakeClient([header]);
    await expect(sink.verify()).resolves.toEqual({ columns: fields.length });
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
