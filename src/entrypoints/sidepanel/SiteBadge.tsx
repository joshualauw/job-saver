import { Badge, HStack, Text } from "@chakra-ui/react";

import { platforms } from "@/config/platforms";
import { findPlatform } from "@/core/job-source";
import { parseHttpUrl } from "@/lib/url";

interface Props {
  /** The active tab's URL; `null` or `undefined` when unknown. */
  url: string | null | undefined;
}

/** Says whether the current site has a dedicated platform entry or uses the generic fallback. */
export function SiteBadge({ url }: Props) {
  const parsed = url ? parseHttpUrl(url) : null;
  if (!url || !parsed) return null;

  const platform = findPlatform(url, platforms);
  if (platform) {
    return (
      <HStack gap="2">
        <Badge colorPalette="green" variant="solid">
          {platform.name}
        </Badge>
        <Text fontSize="xs" color="fg.muted">
          Supported site
        </Text>
      </HStack>
    );
  }

  return (
    <HStack gap="2" align="start">
      <Badge colorPalette="orange" variant="solid" flexShrink="0">
        {parsed.hostname.replace(/^www\./i, "")}
      </Badge>
      <Text fontSize="xs" color="fg.muted">
        Generic reading: less accurate. Highlight the job description for better results.
      </Text>
    </HStack>
  );
}
