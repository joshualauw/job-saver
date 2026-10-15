import { Alert, Button, HStack, Stack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { fields } from "@/config/fields";

import { FieldInput } from "./FieldInput";
import { applyStatusRules, todayIso } from "./status-rules";
import { jobFormResolver, validateInputs } from "./validate";
import type { FormInputs } from "./form-values";

interface Props {
  initialInputs: FormInputs;
  /** Keys of fields the AI could not find. */
  missing: readonly string[];
  /** Called with the full form state after every edit. */
  onChange: (inputs: FormInputs) => void;
  onDiscard: () => void;
}

export function JobForm({ initialInputs, missing, onChange, onDiscard }: Props) {
  const form = useForm<FormInputs>({ defaultValues: initialInputs, resolver: jobFormResolver, mode: "onBlur" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values, name }) => {
        const next = applyStatusRules(values, name, todayIso());
        if (next !== values) form.setValue("appliedAt", next["appliedAt"] ?? "", { shouldDirty: true });
        setReady(false);
        onChange(next);
      },
    });
  }, [form, onChange]);

  const current = useWatch({ control: form.control });
  const { errors } = form.formState;
  const errorCount = Object.keys(errors).length;

  const submit = form.handleSubmit(
    (data) => setReady(validateInputs(data).ok),
    () => setReady(false),
  );

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="3">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            register={form.register}
            control={form.control}
            error={errors[field.key]?.message}
            notFound={missing.includes(field.key) && (current[field.key] ?? "").trim() === ""}
          />
        ))}

        {errorCount > 0 && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {errorCount} {errorCount === 1 ? "field needs" : "fields need"} attention
              </Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {ready && (
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>All values are valid</Alert.Title>
              <Alert.Description>Saving to your Google Sheet is not connected yet.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <HStack>
          <Button type="submit" flex="1">
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onDiscard}>
            Discard
          </Button>
        </HStack>
      </Stack>
    </form>
  );
}
