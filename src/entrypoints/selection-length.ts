import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

import { selectionLength } from "@/features/page-extract/selection";

// Injected by the side panel about once a second to size the user's highlight. It returns only a
// number: no page text leaves the page until the user clicks Analyze.
export default defineUnlistedScript({
  main() {
    return selectionLength(window.getSelection()?.toString() ?? null);
  },
});
