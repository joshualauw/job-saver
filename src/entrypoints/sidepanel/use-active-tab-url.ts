import { useEffect, useState } from "react";

import { watchActiveTab } from "@/lib/chrome";

/**
 * URL of the tab the user is looking at: `null` when the extension cannot see it, `undefined`
 * until the first answer arrives.
 */
export function useActiveTabUrl(): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => watchActiveTab((tab) => setUrl(tab?.url ?? null)), []);

  return url;
}
