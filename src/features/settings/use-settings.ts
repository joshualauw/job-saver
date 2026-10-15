import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { readSettings, writeSettings } from "@/lib/storage";
import type { Settings } from "@/lib/storage";

export const SETTINGS_QUERY_KEY = ["settings"] as const;

export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: () => readSettings() });

  const save = useMutation({
    mutationFn: (patch: Settings) => writeSettings(patch),
    onSuccess: (next) => queryClient.setQueryData(SETTINGS_QUERY_KEY, next),
  });

  return { settings: query.data, isLoading: query.isLoading, save };
}
