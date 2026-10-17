import { z } from "zod";

import { fields } from "@/config/fields";
import type { JobFieldKey } from "@/config/fields";
import { SchemaError, UnexpectedError } from "@/core/errors";
import { columnIndexOf, fromSheetRow, toSheetCells, toSheetRow } from "@/core/row-mapping";
import type { RawCell } from "@/core/row-mapping";
import type { SavedJob, SaveResult, Sink } from "@/core/types";

import { columnLetter, quoteTab } from "./a1-notation";
import type { SheetsClient } from "./sheets-client";

const JOB_URL_KEY = "jobUrl" satisfies JobFieldKey;

const rawCell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const tabResponse = z.object({ values: z.array(z.array(rawCell)).optional() });
const appendResponse = z.object({ updates: z.object({ updatedRange: z.string().optional() }).optional() });
const updateResponse = z.object({}).loose();

export interface SheetsSinkOptions {
  readonly tab: string;
  readonly client: SheetsClient;
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

export function createSheetsSink({ tab, client }: SheetsSinkOptions): Sink {
  const quotedTab = quoteTab(tab);

  // Whole tab in one request: fine for a personal tracker, and it keeps header, lookup and
  // row data consistent with each other. Numbers and dates come back unformatted.
  async function readTab(): Promise<TabSnapshot> {
    const path = `values/${encodeURIComponent(quotedTab)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
    const { values = [] } = await client.get(path, tabResponse);
    const [headerRow = [], ...rows] = values;
    return { header: headerRow.map((cell) => String(cell ?? "")), rows };
  }

  // Compares just the Job URL cell of each row; only the matching row is decoded in full.
  function locate(snapshot: TabSnapshot, jobUrl: string): SavedJob | null {
    if (snapshot.rows.length === 0) return null;

    const urlIndex = columnIndexOf(fields, JOB_URL_KEY, snapshot.header);
    const index = snapshot.rows.findIndex((row) => String(row[urlIndex] ?? "") === jobUrl);
    const row = snapshot.rows[index];
    if (!row) return null;
    return { row: index + 2, values: fromSheetRow(fields, row, snapshot.header) };
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
    async find(jobUrl) {
      return locate(await readTab(), jobUrl);
    },

    async verify() {
      const { header } = await readTab();
      // Throws MissingColumnsError, naming every absent header, if the tab is not set up.
      return { columns: toSheetCells(fields, {}, header).length };
    },

    async save(values): Promise<SaveResult> {
      const jobUrl = values[JOB_URL_KEY];
      if (typeof jobUrl !== "string" || jobUrl === "") {
        throw new SchemaError("A job URL is required to save.");
      }

      // Re-find by URL on every save: rows may have moved since the form was opened.
      const snapshot = await readTab();
      const existing = locate(snapshot, jobUrl);

      if (existing) {
        await writeCells(existing.row, values, snapshot.header);
        return { action: "updated", row: existing.row };
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
