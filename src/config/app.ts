export const appConfig = {
  /** Default OpenAI model; can be overridden in Settings. */
  openaiModel: "gpt-6-luna",
  /** Language of the generated `summary` and `notes`, whatever language the posting is in. */
  summaryLanguage: "English",
  /** Sheet tab used when none is configured. */
  defaultSheetTab: "Jobs",
  /** Upper bound on page text sent to the model, in characters. */
  maxPageTextChars: 12_000,
  /** Most preferences that can be saved. */
  maxPreferences: 20,
} as const;
