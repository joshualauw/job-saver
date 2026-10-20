import { MissingColumnsError, SchemaError } from "./errors";
import { joinList, splitList } from "./normalize";
import type { FieldDef } from "./types";

export type CellValue = string | number | string[] | null;
/** What the Sheets API returns for a cell. */
export type RawCell = string | number | boolean | null | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const GROUPED_NUMBER = /^-?\d{1,3}([.,]\d{3})+$/;
// Sheets serial dates count days from 1899-12-30.
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;
const MAX_SERIAL = 2_958_465; // 9999-12-31

/**
 * Sheet-bound text comes from arbitrary job postings. With `USER_ENTERED`, Sheets would evaluate a
 * leading `=`, `+`, `-` or `@` as a formula and turn text such as `12-14`, `3/4`, `2024` or `TRUE`
 * into a date, number or boolean. A leading apostrophe makes it store the text as typed; it is
 * not part of the stored value, so reads never see it.
 */
export function asText(text: string): string {
  return `'${text}`;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

interface ResolvedColumn {
  readonly field: FieldDef;
  readonly index: number;
}

/**
 * Maps each field that has a sheet column to its column index by header name. Throws if any are
 * missing. Fields without a column live only in the extension and are skipped.
 */
function resolveColumns(fields: readonly FieldDef[], headerRow: readonly string[]): ResolvedColumn[] {
  const indexByHeader = new Map<string, number>();
  headerRow.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key !== "" && !indexByHeader.has(key)) indexByHeader.set(key, index);
  });

  const resolved: ResolvedColumn[] = [];
  const missing: string[] = [];
  for (const field of fields) {
    if (field.column === undefined) continue;
    const index = indexByHeader.get(normalizeHeader(field.column));
    if (index === undefined) missing.push(field.column);
    else resolved.push({ field, index });
  }

  if (missing.length > 0) throw new MissingColumnsError(missing);
  return resolved;
}

function encodeCell(field: FieldDef, value: unknown): string | number {
  if (value === null || value === undefined || value === "") return "";

  switch (field.type) {
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new SchemaError(`"${field.label}" must be a number.`);
      }
      return value;
    case "enum": {
      const option = field.options?.find((candidate) => candidate.value === value);
      if (!option) throw new SchemaError(`"${field.label}" has an unknown value.`);
      return option.label;
    }
    case "date":
      if (typeof value !== "string" || !ISO_DATE.test(value)) {
        throw new SchemaError(`"${field.label}" must be a YYYY-MM-DD date.`);
      }
      return value;
    case "stringList": {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new SchemaError(`"${field.label}" must be a list of text values.`);
      }
      const joined = joinList(value as string[]);
      return joined === "" ? "" : asText(joined);
    }
    case "string":
    case "text":
    case "url":
      return asText(String(value));
  }
}

/**
 * Zero-based header index of one field's column, so a caller can read a single cell without
 * decoding the whole row. Throws `MissingColumnsError` if any configured column is absent.
 */
export function columnIndexOf(fields: readonly FieldDef[], key: string, headerRow: readonly string[]): number {
  const column = resolveColumns(fields, headerRow).find(({ field }) => field.key === key);
  if (!column) throw new SchemaError(`Unknown field "${key}".`);
  return column.index;
}

export interface SheetCell {
  /** Zero-based column index in the header row. */
  readonly index: number;
  readonly value: string | number;
}

/**
 * Only the cells the app owns, with their column index. Updating an existing row writes just
 * these, so columns the user added themselves (and their formulas) are never touched.
 * Throws `MissingColumnsError` if a configured column is absent from the header.
 */
export function toSheetCells(
  fields: readonly FieldDef[],
  values: Readonly<Record<string, unknown>>,
  headerRow: readonly string[],
): SheetCell[] {
  return resolveColumns(fields, headerRow).map(({ field, index }) => ({
    index,
    value: encodeCell(field, values[field.key]),
  }));
}

/**
 * Builds a full row aligned to the sheet's header, for appending. Columns the app does not own
 * are left blank.
 */
export function toSheetRow(
  fields: readonly FieldDef[],
  values: Readonly<Record<string, unknown>>,
  headerRow: readonly string[],
): (string | number)[] {
  const row: (string | number)[] = headerRow.map(() => "");
  for (const { index, value } of toSheetCells(fields, values, headerRow)) {
    row[index] = value;
  }
  return row;
}

function parseNumber(raw: RawCell): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;

  const text = raw.trim();
  if (PLAIN_NUMBER.test(text)) return Number(text);
  // Thousands separators from a formatted cell, e.g. "8,000,000" or "8.000.000".
  if (GROUPED_NUMBER.test(text)) return Number(text.replace(/[.,]/g, ""));
  return null;
}

function serialToIso(serial: number): string | null {
  if (!Number.isInteger(serial) || serial < 1 || serial > MAX_SERIAL) return null;
  return new Date(SHEETS_EPOCH_MS + serial * MS_PER_DAY).toISOString().slice(0, 10);
}

function parseDate(raw: RawCell): string | null {
  if (typeof raw === "number") return serialToIso(Math.floor(raw));
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  return ISO_DATE.test(text) ? text : null;
}

function decodeCell(field: FieldDef, raw: RawCell): CellValue {
  const isBlank = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
  // An empty list cell means "none", not "unknown".
  if (field.type === "stringList") return isBlank ? [] : splitList(String(raw));
  if (isBlank) return null;

  switch (field.type) {
    case "number":
      return parseNumber(raw);
    case "date":
      return parseDate(raw);
    case "enum": {
      const needle = String(raw).trim().toLowerCase();
      const option = field.options?.find(
        (candidate) => candidate.label.toLowerCase() === needle || candidate.value.toLowerCase() === needle,
      );
      return option?.value ?? null;
    }
    case "string":
    case "text":
    case "url":
      return String(raw);
  }
}

/**
 * Reads a sheet row back into field values (by header name). Unparseable or blank cells
 * become `null`; callers validate the result with the form schema.
 *
 * For the most reliable numbers and dates, fetch with `valueRenderOption=UNFORMATTED_VALUE`.
 */
export function fromSheetRow(
  fields: readonly FieldDef[],
  row: readonly RawCell[],
  headerRow: readonly string[],
): Record<string, CellValue> {
  const values: Record<string, CellValue> = {};
  for (const { field, index } of resolveColumns(fields, headerRow)) {
    values[field.key] = decodeCell(field, row[index]);
  }
  return values;
}
