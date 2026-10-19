import { z } from "zod";

import { fields } from "@/config/fields";
import type { JobFieldKey } from "@/config/fields";
import { SchemaError, UnexpectedError } from "@/core/errors";
import { newJobId } from "@/core/job-id";
import { asText, columnIndexOf, fromSheetRow, toSheetCells, toSheetRow } from "@/core/row-mapping";
import type { RawCell } from "@/core/row-mapping";
import type { ListedJob, SaveResult, Sink } from "@/core/types";

import { columnLetter, quoteTab } from "./a1-notation";
import type { SheetsClient } from "./sheets-client";

const JOB_ID_KEY = "jobId" satisfies JobFieldKey;

const rawCell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const tabResponse = z.object({ values: z.array(z.array(rawCell)).optional() });
const appendResponse = z.object({ updates: z.object({ updatedRange: z.string().optional() }).optional() });
const updateResponse = z.object({}).loose();

export interface SheetsSinkOptions {
  readonly tab: string;
  readonly client: SheetsClient;
  /** Injectable for tests; defaults to a random ID. */
  readonly newId?: () => string;
}

interface TabSnapshot {
  readonly header: string[];
  /** Data rows only (no header); `rows[i]` is sheet row `i + 2`. */
  readonly rows: RawCell[][];
}

/** `Jobs!A12:R12` → 12. */
function rowFromRange(range: string | undefined): number | null {
  const match = /!\D*(\d+)/.exec(range ?? "");
  return match?.[1] ? Number(match[1]) : null;
}

function isBlank(cell: RawCell): boolean {
  return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Google refuses to write past the end of the sheet's grid. */
function isOutsideGrid(error: unknown): boolean {
  return error instanceof UnexpectedError && /exceeds grid limits/i.test(error.message);
}

/**
 * First row whose app-owned cells are all empty: a gap left by a deleted job, or the row after the
 * last one. Writing into it (rather than inserting a row) keeps the formatting, dropdowns and date
 * formats the user prepared for it.
 */
function firstFreeRow(snapshot: TabSnapshot): number {
  const owned = toSheetCells(fields, {}, snapshot.header).map((cell) => cell.index);
  const gap = snapshot.rows.findIndex((row) => owned.every((index) => isBlank(row[index])));
  return (gap === -1 ? snapshot.rows.length : gap) + 2;
}

export function createSheetsSink({ tab, client, newId = newJobId }: SheetsSinkOptions): Sink {
  const quotedTab = quoteTab(tab);

  // Whole tab in one request: fine for a personal tracker, and it keeps header, lookup and
  // row data consistent with each other. Numbers and dates come back unformatted.
  async function readTab(): Promise<TabSnapshot> {
    const path = `values/${encodeURIComponent(quotedTab)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
    const { values = [] } = await client.get(path, tabResponse);
    const [headerRow = [], ...rows] = values;
    return { header: headerRow.map((cell) => String(cell ?? "")), rows };
  }

  /** The sheet row holding this job ID, if any. Only the Job ID cell of each row is compared. */
  function locate(snapshot: TabSnapshot, jobId: string): number | null {
    if (snapshot.rows.length === 0) return null;

    const idIndex = columnIndexOf(fields, JOB_ID_KEY, snapshot.header);
    const index = snapshot.rows.findIndex((row) => String(row[idIndex] ?? "") === jobId);
    return index === -1 ? null : index + 2;
  }

  // Only the cells the app owns, so user-added columns, formulas, formats and validation stay intact.
  async function writeCells(
    row: number,
    values: Readonly<Record<string, unknown>>,
    header: readonly string[],
  ): Promise<void> {
    const data = toSheetCells(fields, values, header).map((cell) => ({
      range: `${quotedTab}!${columnLetter(cell.index)}${row}`,
      values: [[cell.value]],
    }));
    await client.post("values:batchUpdate", { valueInputOption: "USER_ENTERED", data }, updateResponse);
  }

  return {
    async list() {
      const snapshot = await readTab();
      if (snapshot.rows.length === 0) return [];

      const idIndex = columnIndexOf(fields, JOB_ID_KEY, snapshot.header);
      const jobs: ListedJob[] = [];
      snapshot.rows.forEach((row, index) => {
        const id = String(row[idIndex] ?? "").trim();
        if (id === "") return;
        const values = fromSheetRow(fields, row, snapshot.header);
        jobs.push({
          id,
          company: textOf(values["company"]),
          jobTitle: textOf(values["jobTitle"]),
          platform: textOf(values["platform"]) || null,
          row: index + 2,
        });
      });
      return jobs;
    },

    async backfillIds() {
      const snapshot = await readTab();
      const idIndex = columnIndexOf(fields, JOB_ID_KEY, snapshot.header);
      const others = toSheetCells(fields, {}, snapshot.header)
        .map((cell) => cell.index)
        .filter((index) => index !== idIndex);

      // A row counts as a job when any app-owned cell besides the ID has content; user-only rows are left alone.
      const data = snapshot.rows.flatMap((row, index) =>
        isBlank(row[idIndex]) && others.some((column) => !isBlank(row[column]))
          ? [{ range: `${quotedTab}!${columnLetter(idIndex)}${index + 2}`, values: [[asText(newId())]] }]
          : [],
      );
      if (data.length === 0) return { filled: 0 };

      await client.post("values:batchUpdate", { valueInputOption: "USER_ENTERED", data }, updateResponse);
      return { filled: data.length };
    },

    async verify() {
      const { header } = await readTab();
      // Throws MissingColumnsError, naming every absent header, if the tab is not set up.
      return { columns: toSheetCells(fields, {}, header).length };
    },

    async save(values): Promise<SaveResult> {
      const jobId = values[JOB_ID_KEY];
      if (typeof jobId !== "string" || jobId === "") {
        throw new SchemaError("A job ID is required to save.");
      }

      // Re-find by ID on every save: rows may have moved since the form was opened.
      const snapshot = await readTab();
      const existing = locate(snapshot, jobId);

      if (existing !== null) {
        await writeCells(existing, values, snapshot.header);
        return { action: "updated", row: existing };
      }

      const target = firstFreeRow(snapshot);
      try {
        await writeCells(target, values, snapshot.header);
        return { action: "created", row: target };
      } catch (error) {
        if (!isOutsideGrid(error)) throw error;
      }

      // The prepared rows ran out: let Google add one. It copies the last row's formatting.
      const row = toSheetRow(fields, values, snapshot.header);
      const path = `values/${encodeURIComponent(`${quotedTab}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const response = await client.post(path, { values: [row] }, appendResponse);
      return { action: "created", row: rowFromRange(response.updates?.updatedRange) ?? target };
    },
  };
}
