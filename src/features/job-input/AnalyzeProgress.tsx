import { HStack, Spinner, Stack, Text } from "@chakra-ui/react";

import type { StepState } from "@/core/types";

import type { InputTab } from "./to-analyze-input";

interface Props {
  steps: readonly StepState[];
  /** The tab being analyzed, which decides what "reading" refers to. */
  tab: InputTab;
}

function label(state: StepState, tab: InputTab): string {
  switch (state.step) {
    case "reading":
      return tab === "image" ? "Reading your images" : "Reading your file";
    case "filling":
      return "Filling in the form";
    case "checking":
      return "Checking how it fits your preferences";
  }
}

/** What "Analyze" is doing right now, one line per stage; stages can run at the same time. */
export function AnalyzeProgress({ steps, tab }: Props) {
  if (steps.length === 0) return null;

  return (
    <Stack gap="1" role="status" aria-live="polite" fontSize="xs">
      {steps.map((state) => (
        <HStack key={state.step} gap="2" color={state.status === "pending" ? "fg.subtle" : "fg.muted"}>
          <HStack w="4" justify="center" flexShrink="0">
            {state.status === "running" ? (
              <Spinner size="xs" />
            ) : (
              <Text as="span" color={state.status === "done" ? "fg.success" : "fg.muted"}>
                {state.status === "done" ? "✓" : "○"}
              </Text>
            )}
          </HStack>
          <Text>{label(state, tab)}</Text>
        </HStack>
      ))}
    </Stack>
  );
}
