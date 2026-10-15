import { defineConfig } from "wxt";

import { platformMatchPatterns } from "./src/config/platform-hosts";

export default defineConfig({
  srcDir: "src",
  // Explicit imports only: no WXT auto-imports.
  imports: false,
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Job Saver",
    description: "Extract job details from the current page with AI and save them to Google Sheets.",
    // Permissions are added as the features that need them land (see ARCHITECTURE_V1.md §11).
    // The panel outlives tab switches but `activeTab` does not, so supported platforms get
    // static host access; `activeTab` covers any other page the user opens the icon on.
    permissions: ["storage", "scripting", "activeTab"],
    host_permissions: [...platformMatchPatterns],
    action: { default_title: "Open Job Saver" },
  },
});
