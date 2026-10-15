import type { PlatformDef } from "@/core/types";
import { stripTrackingParams } from "@/lib/url";

// Matches an optional language prefix, then /job/<numeric id>. Not anchored at the end so
// /job/123/apply and /job/123?ref=x both reduce to /job/123.
const JOB_PATH = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/job\/\d+/i;

/**
 * NOTE: URL shapes are unverified against live pages. Confirm them with real Jobstreet URLs
 * and add fixtures when implementing page extraction (ARCHITECTURE_V1.md §7.4).
 */
const jobstreet: PlatformDef = {
  id: "jobstreet",
  name: "Jobstreet",
  // Regional hosts (id., sg., my., www.jobstreet.com.ph, ...) all contain "jobstreet".
  matchesHost: (hostname) => /(^|\.)jobstreet\./i.test(hostname),
  canonicalizeUrl(url) {
    const jobPath = JOB_PATH.exec(url.pathname)?.[0];
    if (jobPath) return new URL(`${url.origin}${jobPath}`);

    // Search pages show the selected posting via ?jobId=<id>.
    const jobId = url.searchParams.get("jobId");
    if (jobId && /^\d+$/.test(jobId)) return new URL(`${url.origin}/job/${jobId}`);

    return stripTrackingParams(url);
  },
};

export const platforms: readonly PlatformDef[] = [jobstreet];
