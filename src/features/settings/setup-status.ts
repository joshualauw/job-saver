import type { Settings } from "@/lib/storage";

export interface SetupStep {
  readonly id: "openai" | "spreadsheet";
  readonly label: string;
  readonly done: boolean;
}

/** What the user still has to provide before Analyze and Save can work. */
export function setupSteps(settings: Settings | undefined): SetupStep[] {
  return [
    { id: "openai", label: "OpenAI API key", done: Boolean(settings?.openaiApiKey) },
    { id: "spreadsheet", label: "Google spreadsheet", done: Boolean(settings?.spreadsheetId) },
  ];
}

export function isSetupComplete(settings: Settings | undefined): boolean {
  return setupSteps(settings).every((step) => step.done);
}
