import { Alert, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";

import type { JobFieldKey, JobValues } from "@/config/fields";

import { FieldInput } from "./FieldInput";
import { applyStatusRules, todayIso } from "./status-rules";
import { jobFormResolver, validateInputs } from "./validate";
import { formFields } from "./form-values";
import type { FormInputs } from "./form-values";

const APPLIED_AT_KEY = "appliedAt" satisfies JobFieldKey;

interface Props {
  initialInputs: FormInputs;
  /** Keys of fields the AI could not find. */
  missing: readonly string[];
  /** Called with the full form state after every edit. */
  onChange: (inputs: FormInputs) => void;
  /** Called with validated, typed values when the user saves. */
  onSave: (values: JobValues) => void;
  onDiscard: () => void;
  saving: boolean;
  /** Why saving is unavailable right now, if it is. */
  saveDisabledReason: string | null;
  /** Text of the submit button. */
  saveLabel?: string;
  /** Shown under the fields, above the Save buttons. Supplied by the panel so features stay separate. */
  assessment?: ReactNode;
}

export function JobForm({
  initialInputs,
  missing,
  onChange,
  onSave,
  onDiscard,
  saving,
  saveDisabledReason,
  saveLabel = "Save",
  assessment,
}: Props) {
  const form = useForm<FormInputs>({ defaultValues: initialInputs, resolver: jobFormResolver, mode: "onBlur" });

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values, name }) => {
        const next = applyStatusRules(values, name, todayIso());
        if (next !== values) form.setValue(APPLIED_AT_KEY, next[APPLIED_AT_KEY] ?? "", { shouldDirty: true });
        onChange(next);
      },
    });
  }, [form, onChange]);

  const current = useWatch({ control: form.control });
  const { errors } = form.formState;
  const errorCount = Object.keys(errors).length;

  const submit = form.handleSubmit((data) => {
    const result = validateInputs(data);
    if (result.ok) onSave(result.values);
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="3">
        {formFields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            register={form.register}
            control={form.control}
            error={errors[field.key]?.message}
            notFound={missing.includes(field.key) && (current[field.key] ?? "").trim() === ""}
          />
        ))}

        {assessment}

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

        {saveDisabledReason && (
          <Text fontSize="xs" color="fg.muted">
            {saveDisabledReason}
          </Text>
        )}

        <HStack>
          <Button type="submit" flex="1" loading={saving} disabled={saveDisabledReason !== null}>
            {saveLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
        </HStack>
      </Stack>
    </form>
  );
}
