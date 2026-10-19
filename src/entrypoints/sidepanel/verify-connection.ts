import { defaultSinkDeps, openSink } from "./open-sink";
import type { SinkDeps } from "./open-sink";

export interface ConnectionReport {
  readonly tab: string;
  /** How many of the app's columns were found in the tab's header. */
  readonly columns: number;
}

/** "Test connection": sign in, read the saved tab, and confirm every column header is present. */
export async function verifyConnection(deps: SinkDeps = defaultSinkDeps): Promise<ConnectionReport> {
  const { sink, tab } = await openSink("Save a spreadsheet first, then test the connection.", deps);
  const { columns } = await sink.verify();
  return { tab, columns };
}
