import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { AnalyzeInput, StepState } from "@/core/types";

import { analyzeJob } from "./analyze-job";
import { applyProgress } from "./analyze-progress";

/** "Analyze" as a mutation, plus the checklist of stages it is working through. */
export function useAnalyzeJob() {
  const [steps, setSteps] = useState<readonly StepState[]>([]);

  const mutation = useMutation({
    mutationFn: (input: AnalyzeInput) =>
      analyzeJob(input, undefined, (event) => setSteps((current) => applyProgress(current, event))),
    onMutate: () => setSteps([]),
    onSettled: () => setSteps([]),
  });

  return { ...mutation, steps };
}
