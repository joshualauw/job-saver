import { Badge, createListCollection, Field, HStack, Input, Portal, Select, Textarea } from "@chakra-ui/react";
import { useMemo } from "react";
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

function FieldControl({ field, register, control }: Pick<Props, "field" | "register" | "control">) {
  // Code-owned values are shown but not editable.
  const readOnly = field.source === "derived";

  switch (field.type) {
    case "enum":
      return <EnumSelect field={field} control={control} />;
    case "text":
      return <Textarea {...register(field.key)} size="sm" rows={6} />;
    case "number":
      return <Input {...register(field.key)} size="sm" type="number" inputMode="decimal" min={0} step="any" />;
    case "date":
      return <Input {...register(field.key)} size="sm" type="date" readOnly={readOnly} />;
    case "stringList":
      return <Input {...register(field.key)} size="sm" placeholder="comma, separated" />;
    default:
      return <Input {...register(field.key)} size="sm" readOnly={readOnly} />;
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
