import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  // Explicit imports only: no WXT auto-imports.
  imports: false,
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Job Saver",
    description: "Extract job details from the current page with AI and save them to Google Sheets.",
    // Permissions are added as the features that need them land (see ARCHITECTURE_V1.md §11).
    permissions: ["storage"],
    action: { default_title: "Open Job Saver" },
  },
});
