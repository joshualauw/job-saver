import { defineBackground } from "wxt/utils/define-background";

import { openPanelOnActionClick } from "@/lib/chrome";

export default defineBackground(() => {
  void openPanelOnActionClick();
});
