// Manifest match patterns for platforms with a page-content config. Kept import-free so
// wxt.config.ts can load it without the `@/` alias; `platform-hosts.test.ts` checks that every
// pattern is recognised by a platform in `platforms.ts`.
export const platformMatchPatterns = [
  "https://*.jobstreet.com/*",
  "https://*.jobstreet.com.sg/*",
  "https://*.jobstreet.com.my/*",
  "https://*.jobstreet.com.ph/*",
  "https://*.jobstreet.co.id/*",
] as const;
