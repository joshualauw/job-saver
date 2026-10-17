import { appConfig } from "@/config/app";

export type PreferencesParse =
  { readonly ok: true; readonly preferences: string[] } | { readonly ok: false; readonly error: string };

/** One preference per line: trimmed, blanks dropped, repeats (ignoring case) removed. */
export function parsePreferences(text: string, max: number = appConfig.maxPreferences): PreferencesParse {
  const seen = new Set<string>();
  const preferences: string[] = [];
  for (const line of text.split("\n")) {
    const preference = line.trim().replace(/\s+/g, " ");
    const key = preference.toLowerCase();
    if (preference === "" || seen.has(key)) continue;
    seen.add(key);
    preferences.push(preference);
  }

  if (preferences.length > max) return { ok: false, error: `Keep it to ${max} preferences or fewer.` };
  return { ok: true, preferences };
}

export function formatPreferences(preferences: readonly string[] | undefined): string {
  return (preferences ?? []).join("\n");
}
