import { resolveJobSource } from "./job-source";
import type { PlatformDef } from "./types";

/**
 * Whether two page URLs are the same job page once cleaned the way saved URLs are, so tracking
 * params or a fragment don't make a page look different. `null` (a tab the extension cannot see,
 * or a non-web URL) never matches.
 */
export function isSameJobPage(a: string | null, b: string | null, platforms: readonly PlatformDef[]): boolean {
  if (a === null || b === null) return false;
  const first = resolveJobSource(a, platforms);
  const second = resolveJobSource(b, platforms);
  return first !== null && second !== null && first.jobUrl === second.jobUrl;
}
