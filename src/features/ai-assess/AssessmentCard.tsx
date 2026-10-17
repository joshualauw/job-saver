import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";

import type { JobFieldKey } from "@/config/fields";

import { parsePreferenceFit } from "./parse-preference-fit";
import { verdictLevel } from "./schema";
import type { PreferenceAnswer } from "./schema";

const CV_FIT_KEY = "cvFit" satisfies JobFieldKey;
const PREFERENCE_FIT_KEY = "preferenceFit" satisfies JobFieldKey;
const VERDICT_KEY = "verdict" satisfies JobFieldKey;

/** Lowest verdict first; the position in the field's options picks the colour, so no value is named here. */
const LEVEL_PALETTES = ["red", "orange", "teal", "green"] as const;

const MARKS: Readonly<Record<PreferenceAnswer, { symbol: string; label: string; color: string }>> = {
  yes: { symbol: "✓", label: "Yes", color: "fg.success" },
  no: { symbol: "✗", label: "No", color: "fg.error" },
  not_stated: { symbol: "–", label: "Not stated", color: "fg.muted" },
};

interface Props {
  /** The form's inputs, keyed by field key; only the assessment fields are read. */
  inputs: Readonly<Record<string, string>>;
}

/** How well the job fits the user. A view of the assessment fields: it never edits them. */
export function AssessmentCard({ inputs }: Props) {
  const level = verdictLevel(inputs[VERDICT_KEY] ?? "");
  const cvFit = (inputs[CV_FIT_KEY] ?? "").trim();
  const preferences = parsePreferenceFit(inputs[PREFERENCE_FIT_KEY] ?? "");

  if (!level && cvFit === "" && preferences.length === 0) return null;

  const palette = level ? LEVEL_PALETTES[Math.min(level.index, LEVEL_PALETTES.length - 1)] : "gray";

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

        {cvFit !== "" && <Text>{cvFit}</Text>}

        {preferences.length > 0 && (
          <Stack gap="1">
            {preferences.map((line, index) => {
              const mark = line.answer ? MARKS[line.answer] : null;
              return (
                <HStack key={`${index}-${line.text}`} align="start" gap="2">
                  <Text as="span" color={mark?.color ?? "fg.muted"} title={mark?.label} flexShrink="0">
                    {mark?.symbol ?? "•"}
                  </Text>
                  <Text>{line.text}</Text>
                </HStack>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
