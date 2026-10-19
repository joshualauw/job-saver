import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { JobValues } from "@/config/fields";

import { saveJob } from "./save-job";
import { JOB_LIST_QUERY_KEY } from "./use-job-list";

export function useSaveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: JobValues) => saveJob(values),
    // A saved job is a new choice for Save To.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOB_LIST_QUERY_KEY }),
  });
}
