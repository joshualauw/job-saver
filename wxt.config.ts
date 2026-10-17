import { defineConfig } from "wxt";

import { platformMatchPatterns } from "./src/config/platform-hosts";

// Public half of a throwaway keypair. It pins the extension ID (bpbiemlfmenipkbahfkjhchmdllknhpm)
// so the Google OAuth client keeps matching across `pnpm dev`, builds and machines.
const EXTENSION_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqbLzl9iQKDiH5Fwil2loOFqcorq0vozAyiI75ZHuKS7pQyb7UB+pTx84Lqffr7GgMUS4bzqCC2lcvIIV6XfOZDqXpssryxINopPYot9+noX/XDp5+2ImGMRw6+AEF122OHaqDK3cmj8oOVulRa7qO/p220Gq0MOpvRaNB/xe9w5IXHBBKuQJZO/2PByaaxTF4yWlJH5ro+sApfXxOJhWh7dyiDjkrPw57hDZEZ2EJO7t0QahMxr0HmQjo4Dt9X80yuYyyPGcn28KsVBjRztFJa4XflxebEHFSwCgNPUB9mW6UicZWbIJKMDeQ4mTtq1fR2AIia89d3dtSKBwgrEtLQIDAQAB";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export default defineConfig({
  srcDir: "src",
  // Explicit imports only: no WXT auto-imports.
  imports: false,
  modules: ["@wxt-dev/module-react"],
  // A function, so it runs after WXT has loaded `.env.local` into `process.env`.
  manifest: () => {
    const clientId = process.env.OAUTH_CLIENT_ID;
    if (!clientId) {
      console.warn("OAUTH_CLIENT_ID is not set in .env.local: Google sign-in will not work in this build.");
    }

    return {
      name: "Job Saver",
      description: "Extract job details from the current page with AI and save them to Google Sheets.",
      key: EXTENSION_KEY,
      // Permissions are added as the features that need them land (see ARCHITECTURE.md).
      // The panel outlives tab switches but `activeTab` does not (and opening the panel from the
      // icon does not reliably grant it), so supported platforms get static host access and any
      // other site is allowed one at a time from the panel (optional host permissions). `tabs`
      // lets the panel see the active tab's URL on a site it cannot read yet, to ask for that site.
      permissions: ["storage", "scripting", "activeTab", "identity", "tabs"],
      host_permissions: [...platformMatchPatterns, "https://api.openai.com/*", "https://sheets.googleapis.com/*"],
      optional_host_permissions: ["https://*/*", "http://*/*"],
      ...(clientId ? { oauth2: { client_id: clientId, scopes: [SHEETS_SCOPE] } } : {}),
      action: { default_title: "Open Job Saver" },
    };
  },
});
