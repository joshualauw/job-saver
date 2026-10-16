import { useMutation } from "@tanstack/react-query";

import { AppError } from "@/core/errors";
import type { ConnectionState } from "@/features/settings/SettingsView";

import { verifyConnection } from "./verify-connection";

/** "Test connection" as the plain state `SettingsView` renders. */
export function useVerifyConnection(): { state: ConnectionState; run: () => void } {
  const mutation = useMutation({ mutationFn: () => verifyConnection() });

  let result: ConnectionState["result"] = null;
  if (mutation.data) {
    result = {
      kind: "success",
      text: `Connected: tab "${mutation.data.tab}" has all ${mutation.data.columns} columns.`,
    };
  } else if (mutation.error) {
    const text = mutation.error instanceof AppError ? mutation.error.message : "Couldn't test the connection.";
    result = { kind: "error", text };
  }

  return { state: { isPending: mutation.isPending, result }, run: () => mutation.mutate() };
}
