export const appConfig = {
  /** Default OpenAI model; can be overridden in Settings. */
  openaiModel: "gpt-6-luna",
  /** Language of the generated `summary` and `notes`, whatever language the posting is in. */
  summaryLanguage: "English",
  /** Sheet tab used when none is configured. */
  defaultSheetTab: "Jobs",
  /** Upper bound on page text sent to the model, in characters. */
  maxPageTextChars: 12_000,
  /** Most images that can be read in one go (long postings come as several screenshots). */
  maxImages: 5,
  /** Largest single image, in bytes. */
  maxImageBytes: 8 * 1024 * 1024,
  /** Largest PDF or text file, in bytes. */
  maxFileBytes: 10 * 1024 * 1024,
  /** Most preferences that can be saved. */
  maxPreferences: 20,
} as const;
