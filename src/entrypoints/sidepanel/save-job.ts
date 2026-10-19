import type { SaveResult } from "@/core/types";

import { defaultSinkDeps, openSink } from "./open-sink";
import type { SinkDeps } from "./open-sink";

/** Composition root for "Save": write a new row or update the one with the same job ID. */
export async function saveJob(
  values: Readonly<Record<string, unknown>>,
  deps: SinkDeps = defaultSinkDeps,
): Promise<SaveResult> {
  const { sink } = await openSink("Add your Google spreadsheet in Settings first.", deps);
  return sink.save(values);
}
