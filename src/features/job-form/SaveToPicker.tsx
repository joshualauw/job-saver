import { Box, Button, Combobox, Field, Portal, Spinner, Stack, Text, createListCollection } from "@chakra-ui/react";
import { useMemo, useState } from "react";

import type { ListedJob } from "@/core/types";

/** What the panel knows about the sheet's saved jobs; the picker only displays it. */
export interface JobListState {
  readonly jobs: readonly ListedJob[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}

/** How a saved job reads in the list and on the Update button. */
function jobLabel(job: Pick<ListedJob, "company" | "jobTitle">): string {
  const parts = [job.company, job.jobTitle].filter((part) => part !== "");
  return parts.length > 0 ? parts.join(" - ") : "Untitled job";
}

interface Props {
  list: JobListState;
  /** The job currently picked as the save target, if the form's ID belongs to a saved job. */
  target: ListedJob | null;
  /** A saved job's ID to overwrite it, or `null` to go back to saving a new job. */
  onPick: (jobId: string | null) => void;
}

export function SaveToPicker({ list, target, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const collection = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = list.jobs
      .map((job) => ({ value: job.id, label: jobLabel(job), source: job.source }))
      .filter((item) => needle === "" || `${item.label} ${item.source ?? ""}`.toLowerCase().includes(needle));
    return createListCollection({ items });
  }, [list.jobs, query]);

  if (!open && target === null) {
    return (
      <Button type="button" size="xs" variant="ghost" alignSelf="flex-start" onClick={() => setOpen(true)}>
        Save to an existing job…
      </Button>
    );
  }

  return (
    <Stack gap="2">
      <Field.Root>
        <Field.Label>Save to an existing job</Field.Label>
        <Combobox.Root
          size="sm"
          width="full"
          collection={collection}
          value={target ? [target.id] : []}
          inputValue={query}
          openOnClick
          onInputValueChange={(details) => setQuery(details.inputValue)}
          onValueChange={(details) => {
            setQuery("");
            onPick(details.value[0] ?? null);
          }}
        >
          <Combobox.Control>
            <Combobox.Input placeholder={target ? jobLabel(target) : "Search saved jobs"} />
            <Combobox.IndicatorGroup>
              <Combobox.Trigger />
            </Combobox.IndicatorGroup>
          </Combobox.Control>
          <Portal>
            <Combobox.Positioner>
              <Combobox.Content>
                {list.isLoading && (
                  <Box p="2">
                    <Spinner size="sm" />
                  </Box>
                )}
                {!list.isLoading && <Combobox.Empty>No saved jobs found</Combobox.Empty>}
                {collection.items.map((item) => (
                  <Combobox.Item key={item.value} item={item}>
                    <Stack gap="0">
                      <Text>{item.label}</Text>
                      {item.source && (
                        <Text fontSize="xs" color="fg.muted">
                          {item.source}
                        </Text>
                      )}
                    </Stack>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                ))}
              </Combobox.Content>
            </Combobox.Positioner>
          </Portal>
        </Combobox.Root>
      </Field.Root>

      {list.error && (
        <Text fontSize="xs" color="fg.error">
          {list.error}{" "}
          <Button type="button" size="xs" variant="plain" onClick={list.onRetry}>
            Retry
          </Button>
        </Text>
      )}

      {target && (
        <Text fontSize="xs" color="fg.muted">
          Saving will overwrite {jobLabel(target)}.{" "}
          <Button
            type="button"
            size="xs"
            variant="plain"
            onClick={() => {
              onPick(null);
              setOpen(false);
            }}
          >
            Save as a new job instead
          </Button>
        </Text>
      )}
    </Stack>
  );
}
