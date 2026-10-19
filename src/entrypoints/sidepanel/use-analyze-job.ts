import { useMutation } from "@tanstack/react-query";

import type { AnalyzeInput } from "@/core/types";

import { analyzeJob } from "./analyze-job";

export function useAnalyzeJob() {
  return useMutation({ mutationFn: (input: AnalyzeInput) => analyzeJob(input) });
}
