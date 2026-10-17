import { HStack, Stack, Text } from "@chakra-ui/react";

import type { FitLine } from "./parse-fit-lines";
import type { FitAnswer } from "./schema";

const MARKS: Readonly<Record<FitAnswer, { symbol: string; label: string; color: string }>> = {
  yes: { symbol: "✓", label: "Yes", color: "fg.success" },
  no: { symbol: "✗", label: "No", color: "fg.error" },
};

interface Props {
  readonly lines: readonly FitLine[];
}

/** One row per line: a yes / no mark (a plain bullet for text without one) and the text. */
export function FitLines({ lines }: Props) {
  return (
    <Stack gap="1">
      {lines.map((line, index) => {
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
  );
}
