import { Box, Stack, Text } from "@chakra-ui/react";

import type { JobFieldKey } from "@/config/fields";

import { FitLines } from "./FitLines";
import { parseFitLines } from "./parse-fit-lines";

const PREFERENCE_FIT_KEY = "preferenceFit" satisfies JobFieldKey;

interface Props {
  /** The form's inputs, keyed by field key; only the assessment fields are read. */
  inputs: Readonly<Record<string, string>>;
}

/** How the job matches the user's preferences. A view of the assessment fields: it never edits them. */
export function AssessmentCard({ inputs }: Props) {
  const preferences = parseFitLines(inputs[PREFERENCE_FIT_KEY] ?? "");

  if (preferences.length === 0) return null;

  return (
    <Box
      colorPalette="purple"
      bg="colorPalette.subtle"
      borderWidth="1px"
      borderColor="colorPalette.muted"
      borderLeftWidth="2px"
      borderLeftColor="colorPalette.solid"
      borderRadius="md"
      p="3"
    >
      <Stack gap="2">
        <Text fontWeight="semibold" color="colorPalette.fg">
          Fit for you
        </Text>
        <FitLines lines={preferences} />
      </Stack>
    </Box>
  );
}
