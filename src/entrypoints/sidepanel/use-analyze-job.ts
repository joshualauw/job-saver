import { useMutation } from "@tanstack/react-query";

import { analyzeJob } from "./analyze-job";
import type { AnalyzeOptions } from "./analyze-job";

export function useAnalyzeJob() {
  return useMutation({ mutationFn: (options: AnalyzeOptions | undefined) => analyzeJob(options) });
}
