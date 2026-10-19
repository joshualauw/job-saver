import { defineBackground } from "wxt/utils/define-background";

import {
  createSelectionMenu,
  onExtensionInstalled,
  onSelectionMenuClick,
  openPanelOnActionClick,
  openSidePanel,
} from "@/lib/chrome";
import { writeInputText } from "@/lib/storage";

export default defineBackground(() => {
  void openPanelOnActionClick();
  onExtensionInstalled(() => void createSelectionMenu("Send to Job Saver"));

  onSelectionMenuClick((selection, tabId) => {
    // Opening the panel must happen straight from the click, before anything is awaited.
    if (tabId !== undefined) void openSidePanel(tabId);
    void writeInputText(selection);
  });
});
