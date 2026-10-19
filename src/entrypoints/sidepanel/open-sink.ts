import { appConfig } from "@/config/app";
import { UnexpectedError } from "@/core/errors";
import type { Sink } from "@/core/types";
import { createGoogleAuth } from "@/features/sheet-sync/google-auth";
import { createSheetsClient } from "@/features/sheet-sync/sheets-client";
import { createSheetsSink } from "@/features/sheet-sync/sheets-sink";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

/** Real Google Sheets sink for a spreadsheet tab; the side panel's one place that wires it up. */
export function createSink(spreadsheetId: string, tab: string): Sink {
  const client = createSheetsClient({ spreadsheetId, tab, auth: createGoogleAuth() });
  return createSheetsSink({ tab, client });
}

/** The tab jobs are saved to: the one chosen in Settings, or the default. */
export function sheetTabOf(settings: Settings): string {
  return settings.sheetTab ?? appConfig.defaultSheetTab;
}

/** What the sheet-using actions touch, injectable so each is testable without Google. */
export interface SinkDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly createSink: (spreadsheetId: string, tab: string) => Sink;
}

export const defaultSinkDeps: SinkDeps = { readSettings: () => readSettings(), createSink };

/** The sink for the saved spreadsheet; `missingSheetMessage` is what to tell the user when none is saved yet. */
export async function openSink(
  missingSheetMessage: string,
  deps: SinkDeps = defaultSinkDeps,
): Promise<{ readonly sink: Sink; readonly tab: string }> {
  const settings = await deps.readSettings();
  if (!settings.spreadsheetId) throw new UnexpectedError(missingSheetMessage);

  const tab = sheetTabOf(settings);
  return { sink: deps.createSink(settings.spreadsheetId, tab), tab };
}
