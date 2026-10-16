import { useMutation } from "@tanstack/react-query";

import type { JobValues } from "@/config/fields";

import { saveJob } from "./save-job";

export function useSaveJob() {
  return useMutation({ mutationFn: (values: JobValues) => saveJob(values) });
}
