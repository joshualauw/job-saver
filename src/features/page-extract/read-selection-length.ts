import { z } from "zod";

import { executeScriptFile, getActiveTab } from "@/lib/chrome";
import { parseHttpUrl } from "@/lib/url";

// Path of the bundled `src/entrypoints/selection-length.ts` unlisted script.
const SELECTION_SCRIPT = "/selection-length.js";

const lengthSchema = z.number().int().nonnegative();

/**
 * Size of the text highlighted in the active tab. Polled, so it never throws: a tab the extension
 * cannot read (no access yet, a browser page) simply has no selection.
 */
export async function readSelectionLength(): Promise<number> {
  try {
    const tab = await getActiveTab();
    if (!tab || (tab.url !== null && parseHttpUrl(tab.url) === null)) return 0;
    const parsed = lengthSchema.safeParse(await executeScriptFile(tab.id, SELECTION_SCRIPT));
    return parsed.success ? parsed.data : 0;
  } catch {
    return 0;
  }
}
