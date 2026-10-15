export const appConfig = {
  /** Default OpenAI model; can be overridden in Settings. */
  openaiModel: "gpt-6-luna",
  /** Language of the generated `summary` and `notes`, whatever language the posting is in. */
  summaryLanguage: "English",
  /** Status given to a newly saved job. Must be one of the `status` field's option values. */
  defaultStatus: "saved",
  /** Status that stamps `appliedAt` with today's date. Must be a `status` option value. */
  appliedStatus: "applied",
  /** Sheet tab used when none is configured. */
  defaultSheetTab: "Jobs",
  /** Upper bound on page text sent to the model, in characters. */
  maxPageTextChars: 12_000,
} as const;
