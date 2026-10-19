import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/core/errors";
import type { ConnectionState } from "@/features/settings/SettingsView";
import { toaster } from "@/theme/toast";

import { backfillIds } from "./backfill-ids";
import { JOB_LIST_QUERY_KEY } from "./use-job-list";

/** "Add missing Job IDs" as the plain state `SettingsView` renders: success is a toast, failure inline. */
export function useBackfillIds(): { state: ConnectionState; run: () => void } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => backfillIds(),
    onSuccess: ({ filled }) => {
      void queryClient.invalidateQueries({ queryKey: JOB_LIST_QUERY_KEY });
      toaster.create({
        type: "success",
        title: filled === 0 ? "Every job already has an ID." : `Added ${filled} missing Job ${filled === 1 ? "ID" : "IDs"}.`,
      });
    },
  });

  let error: string | null = null;
  if (mutation.error) {
    error = mutation.error instanceof AppError ? mutation.error.message : "Couldn't add the missing Job IDs.";
  }

  return { state: { isPending: mutation.isPending, error }, run: () => mutation.mutate() };
}
