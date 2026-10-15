export const appConfig = {
  /** Default OpenAI model; can be overridden in Settings. Pick the model when AI extraction lands. */
  openaiModel: "gpt-4o-mini",
  /** Status given to a newly saved job. Must be one of the `status` field's option values. */
  defaultStatus: "saved",
  /** Sheet tab used when none is configured. */
  defaultSheetTab: "Jobs",
  /** Upper bound on page text sent to the model, in characters. */
  maxPageTextChars: 12_000,
} as const;
