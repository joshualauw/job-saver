import type { PlatformDef } from "@/core/types";
import { stripTrackingParams } from "@/lib/url";

// Matches an optional language prefix, then /job/<numeric id>. Not anchored at the end so
// /job/123/apply and /job/123?ref=x both reduce to /job/123.
const JOB_PATH = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/job\/\d+/i;

/**
 * Verified against saved pages in tests/fixtures/jobstreet: `/id/job/<id>` URLs and the
 * `data-automation` hooks below (class names are hashed, these attributes are stable).
 */
const jobstreet: PlatformDef = {
  id: "jobstreet",
  name: "Jobstreet",
  // Regional hosts (id., sg., my., www.jobstreet.com.ph, ...) all contain "jobstreet".
  matchesHost: (hostname) => /(^|\.)jobstreet\./i.test(hostname),
  canonicalizeUrl(url) {
    const jobPath = JOB_PATH.exec(url.pathname)?.[0];
    if (jobPath) return new URL(`${url.origin}${jobPath}`);

    // Only detail pages have a canonical job URL; search pages are not analysed.
    return stripTrackingParams(url);
  },
  content: {
    facts: {
      "Job title": '[data-automation="job-detail-title"]',
      Company: '[data-automation="advertiser-name"]',
      Location: '[data-automation="job-detail-location"]',
      "Work type": '[data-automation="job-detail-work-type"]',
      Salary: '[data-automation="job-detail-salary"]',
      Classification: '[data-automation="job-detail-classifications"]',
    },
    description: '[data-automation="jobAdDetails"]',
  },
};

export const platforms: readonly PlatformDef[] = [jobstreet];
