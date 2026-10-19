import { Badge, createListCollection, Field, HStack, Input, Portal, Select, Stack, Textarea } from "@chakra-ui/react";
import type { ListCollection } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import type { Control, UseFormRegister } from "react-hook-form";

import type { fields } from "@/config/fields";

import type { FormInputs } from "./form-values";

type FieldConfig = (typeof fields)[number];

interface Props {
  field: FieldConfig;
  register: UseFormRegister<FormInputs>;
  control: Control<FormInputs>;
  error: string | undefined;
  /** The AI found nothing for this field and it is still empty. */
  notFound: boolean;
}

/** Not a native `<select>`, so it is bound through a `Controller` rather than `register`. */
function EnumSelect({ field, control }: Pick<Props, "field" | "control">) {
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
            <Select.Trigger>
              <Select.ValueText placeholder="Select…" />
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
function SuggestedText({ field, control }: Pick<Props, "field" | "control">) {
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
        <SuggestedTextControl binding={binding} collection={collection} suggestions={suggestions} />
      )}
    />
  );
}

interface SuggestedTextControlProps {
  binding: { name: string; value: string; onChange: (value: string) => void; onBlur: () => void };
  collection: ListCollection<{ label: string; value: string }>;
  suggestions: readonly string[];
}

function SuggestedTextControl({ binding, collection, suggestions }: SuggestedTextControlProps) {
  // Manual mode starts on when the saved value is not one of the template values.
  const [manual, setManual] = useState(binding.value !== "" && !suggestions.includes(binding.value));
  const selected = manual ? OTHER : binding.value;

  return (
    <Stack gap="2" w="full">
      <Select.Root
        size="sm"
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
          <Select.Trigger>
            <Select.ValueText placeholder="Select…" />
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
          placeholder="Type a value"
          value={binding.value}
          onChange={(event) => binding.onChange(event.target.value)}
          onBlur={binding.onBlur}
        />
      )}
    </Stack>
  );
}

function FieldControl({ field, register, control }: Pick<Props, "field" | "register" | "control">) {
  if ("suggestions" in field) return <SuggestedText field={field} control={control} />;

  switch (field.type) {
    case "enum":
      return <EnumSelect field={field} control={control} />;
    case "text":
      return <Textarea {...register(field.key)} size="sm" rows={6} />;
    case "number":
      return <Input {...register(field.key)} size="sm" type="number" inputMode="decimal" min={0} step="any" />;
    case "stringList":
      return <Input {...register(field.key)} size="sm" placeholder="comma, separated" />;
    case "url":
      return <Input {...register(field.key)} size="sm" type="url" inputMode="url" placeholder="https://" />;
    default:
      return <Input {...register(field.key)} size="sm" />;
  }
}

export function FieldInput({ field, register, control, error, notFound }: Props) {
  return (
    <Field.Root invalid={error !== undefined}>
      <HStack justify="space-between" w="full">
        <Field.Label>{field.label}</Field.Label>
        {notFound && (
          <Badge colorPalette="orange" size="xs">
            Not found
          </Badge>
        )}
      </HStack>
      <FieldControl field={field} register={register} control={control} />
      {error && <Field.ErrorText>{error}</Field.ErrorText>}
    </Field.Root>
  );
}
