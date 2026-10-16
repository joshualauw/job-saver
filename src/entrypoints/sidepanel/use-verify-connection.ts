import { useMutation } from "@tanstack/react-query";

import { AppError } from "@/core/errors";
import type { ConnectionState } from "@/features/settings/SettingsView";
import { toaster } from "@/theme/toast";

import { verifyConnection } from "./verify-connection";

/** "Test connection" as the plain state `SettingsView` renders: success is a toast, failure inline. */
export function useVerifyConnection(): { state: ConnectionState; run: () => void } {
  const mutation = useMutation({
    mutationFn: () => verifyConnection(),
    onSuccess: ({ tab, columns }) =>
      toaster.create({ type: "success", title: `Connected: tab "${tab}" has all ${columns} columns.` }),
  });

  let error: string | null = null;
  if (mutation.error) {
    error = mutation.error instanceof AppError ? mutation.error.message : "Couldn't test the connection.";
  }

  return { state: { isPending: mutation.isPending, error }, run: () => mutation.mutate() };
}
