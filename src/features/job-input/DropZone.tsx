import { Box, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";

interface Props {
  /** Passed to the file picker's `accept`. */
  accept: string;
  multiple: boolean;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
}

/** A click-or-drop area for files. Pasting is handled by the tab that owns the zone. */
export function DropZone({ accept, multiple, title, hint, onFiles }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const open = () => picker.current?.click();

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    onFiles([...event.dataTransfer.files]);
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragOver={(event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={dragging ? "colorPalette.solid" : "border"}
      bg={dragging ? "bg.muted" : "bg.subtle"}
      rounded="md"
      p="4"
      textAlign="center"
      cursor="pointer"
    >
      <Text fontWeight="medium">{title}</Text>
      <Text fontSize="xs" color="fg.muted">
        {hint}
      </Text>
      <input
        ref={picker}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          // So choosing the same file again still counts as a change.
          event.target.value = "";
        }}
      />
    </Box>
  );
}
