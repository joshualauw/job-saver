import { appConfig } from "@/config/app";
import { UnexpectedError } from "@/core/errors";
import type { Sink } from "@/core/types";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

import { createSink } from "./create-sink";

export interface VerifyDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly createSink: (spreadsheetId: string, tab: string) => Sink;
}

export interface ConnectionReport {
  readonly tab: string;
  /** How many of the app's columns were found in the tab's header. */
  readonly columns: number;
}

const defaultDeps: VerifyDeps = { readSettings: () => readSettings(), createSink };

/** "Test connection": sign in, read the saved tab, and confirm every column header is present. */
export async function verifyConnection(deps: VerifyDeps = defaultDeps): Promise<ConnectionReport> {
  const { spreadsheetId, sheetTab } = await deps.readSettings();
  if (!spreadsheetId) throw new UnexpectedError("Save a spreadsheet first, then test the connection.");

  const tab = sheetTab ?? appConfig.defaultSheetTab;
  const { columns } = await deps.createSink(spreadsheetId, tab).verify();
  return { tab, columns };
}
