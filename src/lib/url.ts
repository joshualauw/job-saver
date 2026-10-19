/** Parses an http(s) URL; returns `null` for anything else (including `chrome://`). */
export function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
