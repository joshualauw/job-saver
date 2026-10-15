import { describe, expect, it } from "vitest";

import { platformMatchPatterns } from "./platform-hosts";
import { platforms } from "./platforms";

// A match pattern like `https://*.jobstreet.com/*` → a sample host `www.jobstreet.com`.
function sampleHost(pattern: string): string {
  const match = /^https:\/\/\*\.([^/]+)\/\*$/.exec(pattern);
  if (!match?.[1]) throw new Error(`Unexpected match pattern shape: ${pattern}`);
  return `www.${match[1]}`;
}

describe("platformMatchPatterns", () => {
  it("only lists hosts that a configured platform recognises", () => {
    for (const pattern of platformMatchPatterns) {
      const host = sampleHost(pattern);
      expect(
        platforms.some((platform) => platform.matchesHost(host)),
        `${pattern} (${host})`,
      ).toBe(true);
    }
  });

  it("covers every platform that has page-content selectors", () => {
    // Guards against adding a platform with selectors but no manifest host access.
    for (const platform of platforms) {
      if (!platform.content) continue;
      const covered = platformMatchPatterns.some((pattern) => platform.matchesHost(sampleHost(pattern)));
      expect(covered, platform.id).toBe(true);
    }
  });
});
