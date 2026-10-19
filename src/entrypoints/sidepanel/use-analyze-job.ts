import { useMutation } from "@tanstack/react-query";

import { analyzeJob } from "./analyze-job";

export function useAnalyzeJob() {
  return useMutation({ mutationFn: () => analyzeJob() });
}
