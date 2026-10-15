import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

import { appConfig } from "@/config/app";
import { platforms } from "@/config/platforms";
import { buildPagePayload } from "@/features/page-extract/extract-page";

// Injected into the job page by the side panel (chrome.scripting.executeScript). The value
// returned from `main` is delivered back to the caller as the injection result.
export default defineUnlistedScript({
  main() {
    return buildPagePayload(document, {
      platforms,
      maxChars: appConfig.maxPageTextChars,
      selection: window.getSelection()?.toString() ?? null,
    });
  },
});
