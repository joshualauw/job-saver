import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";

import type { JobFieldKey } from "@/config/fields";

import { FitLines } from "./FitLines";
import { parseFitLines } from "./parse-fit-lines";
import { verdictLevel } from "./schema";

const CV_FIT_KEY = "cvFit" satisfies JobFieldKey;
const PREFERENCE_FIT_KEY = "preferenceFit" satisfies JobFieldKey;
const VERDICT_KEY = "verdict" satisfies JobFieldKey;

/** Lowest verdict first; the position in the field's options picks the colour, so no value is named here. */
const LEVEL_PALETTES = ["red", "orange", "teal", "green"] as const;

const TITLE_STYLE = { fontSize: "xs", fontWeight: "medium", color: "fg.muted" } as const;

interface Props {
  /** The form's inputs, keyed by field key; only the assessment fields are read. */
  inputs: Readonly<Record<string, string>>;
}

/** How well the job fits the user. A view of the assessment fields: it never edits them. */
export function AssessmentCard({ inputs }: Props) {
  const level = verdictLevel(inputs[VERDICT_KEY] ?? "");
  const cvFit = parseFitLines(inputs[CV_FIT_KEY] ?? "");
  const preferences = parseFitLines(inputs[PREFERENCE_FIT_KEY] ?? "");

  if (!level && cvFit.length === 0 && preferences.length === 0) return null;

  const palette = level ? LEVEL_PALETTES[Math.min(level.index, LEVEL_PALETTES.length - 1)] : "gray";
  // The two lists only need names when both are shown; a lone list is clear from the card title.
  const titled = cvFit.length > 0 && preferences.length > 0;

  return (
    <Box borderWidth="1px" borderRadius="md" p="3">
      <Stack gap="2">
        <HStack justify="space-between">
          <Text fontWeight="semibold">Fit for you</Text>
          {level && (
            <Badge colorPalette={palette} variant="solid">
              {level.label}
            </Badge>
          )}
        </HStack>

        {cvFit.length > 0 && (
          <Stack gap="1">
            {titled && <Text {...TITLE_STYLE}>CV</Text>}
            <FitLines lines={cvFit} />
          </Stack>
        )}

        {preferences.length > 0 && (
          <Stack gap="1">
            {titled && <Text {...TITLE_STYLE}>Preferences</Text>}
            <FitLines lines={preferences} />
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
