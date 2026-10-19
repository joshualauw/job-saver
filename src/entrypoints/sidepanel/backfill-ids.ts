import { appConfig } from "@/config/app";
import { UnexpectedError } from "@/core/errors";
import type { Sink } from "@/core/types";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

import { createSink } from "./create-sink";

export interface BackfillDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly createSink: (spreadsheetId: string, tab: string) => Sink;
}

const defaultDeps: BackfillDeps = { readSettings: () => readSettings(), createSink };

/** "Add missing Job IDs": gives rows saved before IDs existed an ID, and reports how many it filled. */
export async function backfillIds(deps: BackfillDeps = defaultDeps): Promise<{ readonly filled: number }> {
  const { spreadsheetId, sheetTab } = await deps.readSettings();
  if (!spreadsheetId) throw new UnexpectedError("Save a spreadsheet first, then add the missing Job IDs.");

  return deps.createSink(spreadsheetId, sheetTab ?? appConfig.defaultSheetTab).backfillIds();
}
