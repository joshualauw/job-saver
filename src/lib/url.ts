const TRACKING_PARAMS: readonly (string | RegExp)[] = [
  /^utm_/i,
  "fbclid",
  "gclid",
  "msclkid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "li_fat_id",
  "trk",
  "trkInfo",
  "trackingId",
  "refId",
];

function isTrackingParam(name: string): boolean {
  return TRACKING_PARAMS.some((param) =>
    typeof param === "string" ? param.toLowerCase() === name.toLowerCase() : param.test(name),
  );
}

/** Parses an http(s) URL; returns `null` for anything else (including `chrome://`). */
export function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Generic cleanup: drops the fragment and well-known tracking params, sorts what remains so
 * equal URLs compare equal, and removes a trailing slash from non-root paths.
 */
export function stripTrackingParams(url: URL): URL {
  const clean = new URL(url.href);
  clean.hash = "";

  for (const name of [...clean.searchParams.keys()]) {
    if (isTrackingParam(name)) clean.searchParams.delete(name);
  }
  clean.searchParams.sort();

  if (clean.pathname.length > 1 && clean.pathname.endsWith("/")) {
    clean.pathname = clean.pathname.replace(/\/+$/, "");
  }
  return clean;
}
