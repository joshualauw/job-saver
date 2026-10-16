import { useQuery } from "@tanstack/react-query";

import { readSelectionLength } from "@/features/page-extract/read-selection-length";

const POLL_MS = 1000;

/** Length of the text highlighted in the active tab, refreshed about once a second while enabled. */
export function useSelectionLength(enabled: boolean): number {
  const query = useQuery({
    queryKey: ["selection-length"],
    queryFn: readSelectionLength,
    enabled,
    refetchInterval: POLL_MS,
    // Always re-read: a selection can change without anything the panel can observe.
    staleTime: 0,
    gcTime: 0,
  });
  return enabled ? (query.data ?? 0) : 0;
}
