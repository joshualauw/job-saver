import { Alert, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { appConfig } from "@/config/app";

import { DropZone } from "./DropZone";
import { IMAGE_ACCEPT, readImages } from "./read-attachment";
import type { ImageItem } from "./read-attachment";

interface Props {
  images: readonly ImageItem[];
  /** Whether this tab is showing, so pasting only lands here when it should. */
  active: boolean;
  onAdd: (items: readonly ImageItem[]) => void;
  onRemove: (id: string) => void;
}

export function ImageTab({ images, active, onAdd, onRemove }: Props) {
  const [errors, setErrors] = useState<readonly string[]>([]);

  const take = async (files: readonly File[]) => {
    const { items, errors: rejected } = await readImages(files, appConfig.maxImages - images.length);
    setErrors(rejected);
    if (items.length > 0) onAdd(items);
  };

  // Screenshots are usually pasted, so listen for that while this tab is showing.
  useEffect(() => {
    if (!active) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) return;
      event.preventDefault();
      void take(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <Stack gap="3">
      <DropZone
        accept={IMAGE_ACCEPT}
        multiple
        title="Add screenshots"
        hint={`Click, drop or paste. Up to ${appConfig.maxImages}, in reading order.`}
        onFiles={(files) => void take(files)}
      />

      {errors.map((message) => (
        <Alert.Root key={message} status="warning" size="sm">
          <Alert.Indicator />
          <Alert.Title>{message}</Alert.Title>
        </Alert.Root>
      ))}

      {images.length > 0 && (
        <HStack gap="2" wrap="wrap">
          {images.map((image) => (
            <Box key={image.id} position="relative">
              <img
                src={image.dataUrl}
                alt={image.name}
                style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }}
              />
              <Button
                type="button"
                size="2xs"
                variant="solid"
                position="absolute"
                top="-1"
                right="-1"
                minW="5"
                h="5"
                px="0"
                aria-label={`Remove ${image.name}`}
                onClick={() => onRemove(image.id)}
              >
                ✕
              </Button>
            </Box>
          ))}
        </HStack>
      )}

      <Text fontSize="xs" color="fg.muted">
        Sent to OpenAI to read, not stored. Forgotten when you close the panel.
      </Text>
    </Stack>
  );
}
