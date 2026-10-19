import {
  Box,
  createListCollection,
  Field,
  HStack,
  Input,
  Portal,
  Select,
  TagsInput,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { ListCollection } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import type { Control, UseFormRegister } from "react-hook-form";

import type { fields } from "@/config/fields";
import { joinList, splitList } from "@/core/normalize";

import type { FormInputs } from "./form-values";

type FieldConfig = (typeof fields)[number];

/** An empty field the AI found nothing for: an orange outline, and "Not found" where the placeholder would be. */
const NOT_FOUND_OUTLINE = { borderColor: "orange.emphasized" } as const;
const outlineFor = (notFound: boolean) => (notFound ? NOT_FOUND_OUTLINE : {});
const placeholderFor = (notFound: boolean, normal: string) => (notFound ? "Not found" : normal);

interface Props {
  field: FieldConfig;
  register: UseFormRegister<FormInputs>;
  control: Control<FormInputs>;
  error: string | undefined;
  /** The AI found nothing for this field and it is still empty. */
  notFound: boolean;
}

/** Not a native `<select>`, so it is bound through a `Controller` rather than `register`. */
function EnumSelect({ field, control, notFound }: Pick<Props, "field" | "control" | "notFound">) {
  const clearable = !("required" in field && field.required);
  const collection = useMemo(() => {
    const options = "options" in field ? field.options : [];
    return createListCollection({ items: options.map((option) => ({ label: option.label, value: option.value })) });
  }, [field]);

  return (
    <Controller
      control={control}
      name={field.key}
      render={({ field: binding }) => (
        <Select.Root
          size="sm"
          collection={collection}
          name={binding.name}
          value={binding.value ? [binding.value] : []}
          onValueChange={(details) => binding.onChange(details.value[0] ?? "")}
          onInteractOutside={binding.onBlur}
        >
          <Select.Control>
            <Select.Trigger {...outlineFor(notFound)}>
              <Select.ValueText placeholder={placeholderFor(notFound, "Select…")} />
            </Select.Trigger>
            <Select.IndicatorGroup>
              {clearable && <Select.ClearTrigger />}
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {collection.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
      )}
    />
  );
}

const OTHER = "__other__";
const NO_SUGGESTIONS: readonly string[] = [];

/**
 * Free text with a dropdown of common values as a template. "Other" (or any value outside the
 * template, such as an old one read from the sheet) shows a plain text input, so nothing is rejected.
 */
function SuggestedText({ field, control, notFound }: Pick<Props, "field" | "control" | "notFound">) {
  const suggestions = "suggestions" in field ? field.suggestions : NO_SUGGESTIONS;
  const collection = useMemo(
    () =>
      createListCollection({
        items: [...suggestions.map((value) => ({ label: value, value })), { label: "Other…", value: OTHER }],
      }),
    [suggestions],
  );

  return (
    <Controller
      control={control}
      name={field.key}
      render={({ field: binding }) => (
        <SuggestedTextControl binding={binding} collection={collection} suggestions={suggestions} notFound={notFound} />
      )}
    />
  );
}

interface SuggestedTextControlProps {
  binding: { name: string; value: string; onChange: (value: string) => void; onBlur: () => void };
  collection: ListCollection<{ label: string; value: string }>;
  suggestions: readonly string[];
  notFound: boolean;
}

function SuggestedTextControl({ binding, collection, suggestions, notFound }: SuggestedTextControlProps) {
  // Manual mode starts on when the saved value is not one of the template values.
  const [manual, setManual] = useState(binding.value !== "" && !suggestions.includes(binding.value));
  const selected = manual ? OTHER : binding.value;

  return (
    <HStack gap="2" w="full" align="start">
      <Select.Root
        size="sm"
        flex="1"
        minW="0"
        collection={collection}
        name={binding.name}
        value={selected ? [selected] : []}
        onValueChange={(details) => {
          const choice = details.value[0] ?? "";
          if (choice === OTHER) {
            setManual(true);
            // A template value would otherwise sit in the text box as if the user had typed it.
            if (suggestions.includes(binding.value)) binding.onChange("");
          } else {
            setManual(false);
            binding.onChange(choice);
          }
        }}
        onInteractOutside={binding.onBlur}
      >
        <Select.Control>
          <Select.Trigger {...outlineFor(notFound)}>
            <Select.ValueText placeholder={placeholderFor(notFound, "Select…")} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.ClearTrigger
              onClick={() => {
                setManual(false);
                binding.onChange("");
              }}
            />
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {collection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
      {manual && (
        <Input
          // Not the field's own ID: the dropdown's hidden <select> looks itself up by that ID, and
          // finding this <input> instead crashes the panel.
          id={`${binding.name}-manual`}
          autoFocus
          size="sm"
          flex="1"
          minW="0"
          placeholder="Type a value"
          value={binding.value}
          onChange={(event) => binding.onChange(event.target.value)}
          onBlur={binding.onBlur}
        />
      )}
    </HStack>
  );
}

/** Skills as removable tags; the form still holds them as one comma-separated string. */
function TagsControl({ field, control, notFound }: Pick<Props, "field" | "control" | "notFound">) {
  return (
    <Controller
      control={control}
      name={field.key}
      render={({ field: binding }) => (
        <TagsInput.Root
          size="sm"
          w="full"
          value={splitList(binding.value)}
          onValueChange={(details) => binding.onChange(joinList(details.value))}
          delimiter=","
          addOnPaste
          blurBehavior="add"
        >
          <TagsInput.Control {...outlineFor(notFound)}>
            <TagsInput.Items />
            <TagsInput.Input placeholder={placeholderFor(notFound, "Add a skill")} />
          </TagsInput.Control>
        </TagsInput.Root>
      )}
    />
  );
}

function FieldControl({
  field,
  register,
  control,
  notFound,
}: Pick<Props, "field" | "register" | "control" | "notFound">) {
  const outline = outlineFor(notFound);
  if ("suggestions" in field) return <SuggestedText field={field} control={control} notFound={notFound} />;

  switch (field.type) {
    case "enum":
      return <EnumSelect field={field} control={control} notFound={notFound} />;
    case "text":
      return (
        <Textarea {...register(field.key)} size="sm" rows={6} placeholder={placeholderFor(notFound, "")} {...outline} />
      );
    case "number": {
      const input = (
        <Input
          {...register(field.key)}
          size="sm"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder={placeholderFor(notFound, "")}
          {...outline}
        />
      );
      if (!("unit" in field)) return input;
      return (
        <HStack gap="2" w="full">
          <Box flex="1" minW="0">
            {input}
          </Box>
          <Text color="fg.muted" flexShrink="0">
            {field.unit}
          </Text>
        </HStack>
      );
    }
    case "stringList":
      return <TagsControl field={field} control={control} notFound={notFound} />;
    case "url":
      return (
        <Input
          {...register(field.key)}
          size="sm"
          type="url"
          inputMode="url"
          placeholder={placeholderFor(notFound, "https://")}
          {...outline}
        />
      );
    default:
      return <Input {...register(field.key)} size="sm" placeholder={placeholderFor(notFound, "")} {...outline} />;
  }
}

export function FieldInput({ field, register, control, error, notFound }: Props) {
  return (
    <Field.Root invalid={error !== undefined}>
      <Field.Label>{field.label}</Field.Label>
      <FieldControl field={field} register={register} control={control} notFound={notFound} />
      {error && <Field.ErrorText>{error}</Field.ErrorText>}
    </Field.Root>
  );
}
