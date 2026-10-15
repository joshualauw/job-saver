import { PageAccessError, SchemaError } from "@/core/errors";
import { pagePayloadSchema } from "@/core/page-payload";
import type { PagePayload } from "@/core/page-payload";
import { executeScriptFile, getActiveTab } from "@/lib/chrome";
import { parseHttpUrl } from "@/lib/url";

// Path of the bundled `src/entrypoints/extract-job.ts` unlisted script.
const EXTRACT_SCRIPT = "/extract-job.js";

/** Reads the job page in the active tab and returns a validated payload. */
export async function extractActivePage(): Promise<PagePayload> {
  const tab = await getActiveTab();
  if (!tab) throw new PageAccessError("No active tab found. Open a job posting and try again.");

  // The URL is hidden without permission; only reject when we can see it is not a web page.
  if (tab.url !== null && parseHttpUrl(tab.url) === null) {
    throw new PageAccessError("This kind of page can't be read. Open a job posting first.");
  }

  let result: unknown;
  try {
    result = await executeScriptFile(tab.id, EXTRACT_SCRIPT);
  } catch (cause) {
    throw new PageAccessError(
      "Job Saver can't read this tab. Click the Job Saver toolbar icon on this tab to allow access, then try again.",
      { cause },
    );
  }

  const parsed = pagePayloadSchema.safeParse(result);
  if (!parsed.success) {
    throw new SchemaError("The page returned data in an unexpected format.", { cause: parsed.error });
  }
  return parsed.data;
}
