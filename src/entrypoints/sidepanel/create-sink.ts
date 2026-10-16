import type { Sink } from "@/core/types";
import { createGoogleAuth } from "@/features/sheet-sync/google-auth";
import { createSheetsClient } from "@/features/sheet-sync/sheets-client";
import { createSheetsSink } from "@/features/sheet-sync/sheets-sink";

/** Real Google Sheets sink for a spreadsheet tab; the side panel's one place that wires it up. */
export function createSink(spreadsheetId: string, tab: string): Sink {
  const client = createSheetsClient({ spreadsheetId, tab, auth: createGoogleAuth() });
  return createSheetsSink({ tab, client });
}
