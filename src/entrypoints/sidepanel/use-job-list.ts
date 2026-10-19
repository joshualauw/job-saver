import { useQuery } from "@tanstack/react-query";

import { AppError } from "@/core/errors";
import type { ListedJob } from "@/core/types";
import type { JobListState } from "@/features/job-form/SaveToPicker";
import type { Settings } from "@/lib/storage";

import { createSink, sheetTabOf } from "./open-sink";

export const JOB_LIST_QUERY_KEY = ["jobs"] as const;

const NO_JOBS: readonly ListedJob[] = [];

/**
 * The saved jobs the Save To picker offers. One read of the sheet, kept for a minute and refreshed
 * after every save. Not retried: Google sign-in can prompt, so a failure waits for the user's Retry.
 */
export function useJobList(settings: Settings | undefined, enabled: boolean): JobListState | null {
  const spreadsheetId = settings?.spreadsheetId;
  const tab = sheetTabOf(settings ?? {});

  const query = useQuery({
    queryKey: [...JOB_LIST_QUERY_KEY, spreadsheetId, tab],
    queryFn: () => (spreadsheetId ? createSink(spreadsheetId, tab).list() : Promise.resolve([])),
    enabled: enabled && Boolean(spreadsheetId),
    staleTime: 60_000,
    retry: false,
  });

  if (!spreadsheetId) return null;

  let error: string | null = null;
  if (query.error) {
    error = query.error instanceof AppError ? query.error.message : "Couldn't load your saved jobs.";
  }
  return { jobs: query.data ?? NO_JOBS, isLoading: query.isFetching, error, onRetry: () => void query.refetch() };
}
