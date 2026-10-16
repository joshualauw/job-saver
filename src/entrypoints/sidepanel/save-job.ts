import { UnexpectedError } from "@/core/errors";
import type { SaveResult, Sink } from "@/core/types";
import { todayIso } from "@/features/job-form/status-rules";
import { readSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

import { createSink } from "./create-sink";

export interface SaveDeps {
  readonly readSettings: () => Promise<Settings>;
  readonly createSink: (spreadsheetId: string) => Sink;
  readonly today: () => string;
}

const defaultDeps: SaveDeps = { readSettings: () => readSettings(), createSink, today: () => todayIso() };

/** Composition root for "Save": append a new row or update the one for the same job URL. */
export async function saveJob(
  values: Readonly<Record<string, unknown>>,
  deps: SaveDeps = defaultDeps,
): Promise<SaveResult> {
  const { spreadsheetId } = await deps.readSettings();
  if (!spreadsheetId) throw new UnexpectedError("Add your Google spreadsheet first.");

  return deps.createSink(spreadsheetId).save(values, deps.today());
}
