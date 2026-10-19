import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { watchSessionValue } from "@/lib/chrome";
import { clearCapturedSelection, parseCapturedSelection, readCapturedSelection, SELECTION_KEY } from "@/lib/storage";

const SELECTION_QUERY_KEY = ["selection"] as const;

/**
 * The text last sent to the panel from the right-click menu, kept in step with session storage: the
 * panel may already be open when the menu item is used, or may open because of it.
 */
export function useCapturedSelection() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: SELECTION_QUERY_KEY, queryFn: () => readCapturedSelection(), staleTime: Infinity });

  useEffect(
    () =>
      watchSessionValue(SELECTION_KEY, (value) => {
        queryClient.setQueryData(SELECTION_QUERY_KEY, parseCapturedSelection(value));
      }),
    [queryClient],
  );

  const clear = useCallback(() => {
    queryClient.setQueryData(SELECTION_QUERY_KEY, null);
    void clearCapturedSelection();
  }, [queryClient]);

  return { text: query.data ?? null, isLoading: query.isLoading, clear };
}
