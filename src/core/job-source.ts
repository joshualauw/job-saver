import { parseHttpUrl, stripTrackingParams } from "@/lib/url";

import type { JobSource, PlatformDef } from "./types";

/**
 * Derives the `platform` and clean `jobUrl` fields from a page URL (no AI involved).
 * Returns `null` when the URL is not an http(s) URL.
 */
export function resolveJobSource(rawUrl: string, platforms: readonly PlatformDef[]): JobSource | null {
  const url = parseHttpUrl(rawUrl);
  if (!url) return null;

  const platform = platforms.find((candidate) => candidate.matchesHost(url.hostname));
  if (platform) {
    return { platform: platform.name, jobUrl: platform.canonicalizeUrl(url).href };
  }

  return {
    platform: url.hostname.replace(/^www\./i, ""),
    jobUrl: stripTrackingParams(url).href,
  };
}
