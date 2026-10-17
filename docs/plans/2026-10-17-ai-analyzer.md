# AI analyzer

Status: steps 1 and 2 done; steps 3 to 6 not started. Product context: [PRD.md](../PRD.md). Shape of the code:
[ARCHITECTURE.md](../ARCHITECTURE.md).

## Goal

Besides filling the form, Analyze tells the user how strong a job is for them: how well it fits
their CV, which of their preferences it meets, and an overall verdict. The result is shown in a
bordered card under the form and saved to the sheet with the rest of the job.

This is outside the V1 scope in the PRD; it exists because the user asked for it. Step 6 below adds
it to the PRD and roadmap.

## What the user gets

- In Settings: a **CV** loaded from a file, and a **list of preferences** (one per line).
- On Analyze (only when a CV or preferences are set; otherwise nothing changes):
  - **CV fit**: a short written assessment, not a percentage.
  - **Preference fit**: one line per preference, each marked yes, no or not stated.
  - **Verdict**: low, medium, high or very high.
- The three results are columns in the sheet, like any other field.

## Decisions

- **CV is read from a file, as plain text.** The file is read in the browser and its raw text is
  cleaned (whitespace and blank lines, reusing the existing text-cleaning helper). No structure is
  parsed. Only the text is stored, not the file.
- **PDF is the main format**, read with pdf.js (a new dependency, approved by the user).
  Plain `.txt` and `.md` files are also accepted and need no library. Word files are out of scope.
  A PDF with no text layer (a scan or an image) yields nothing to read; the user is told so rather
  than ending up with an empty CV.
- **Preferences are free-text lines**, judged by the model against the posting.
- **"Not stated" is a valid answer** for a preference. Forcing yes or no would push the model to
  guess; unknowns stay unknown.
- **A second OpenAI call, run in parallel with extraction.** The existing extraction prompt and
  schema stay untouched. The assessor receives the page payload plus the CV and preferences. No
  added waiting time; one extra request per Analyze.
- **Results are AI-sourced fields**, defined in the single field list like the others, so the
  schemas and sheet mapping come from there. The user-owned and code-owned fields stay out of the
  model's reach.
- **Preference fit is one text cell**, one line per preference, each starting with "Yes:", "No:" or
  "Not stated:". The formula-injection guard only looks at the first character of the whole cell, so
  the first line must not begin with `=`, `+`, `-` or `@`; the prefixes guarantee that.
- **The three fields are read-only in the UI**, shown in the card rather than as inputs. The form
  still saves them. If a wrong verdict needs correcting, the user re-analyzes or edits the sheet.
- **Privacy.** The CV is personal data. It lives only in `chrome.storage.local`, is sent only to
  OpenAI with `store: false`, and is never logged, committed, shown in errors or written to the
  sheet. The page text stays untrusted: it goes in the user message only, fenced, and the prompt
  tells the model to ignore instructions inside it (a posting must not be able to talk up its own
  verdict). The CV and preferences are the user's own and count as trusted input.
- **Bounded size.** The stored CV is capped at 6,000 characters so cost per Analyze stays small and
  predictable. Over the cap, the user is told and the CV is not saved, rather than silently cut.
- **The card sits in the same place every time**, whether the job is new or already saved: at the
  bottom of the form, directly below the Notes input and above the error summary and the Save and
  Discard buttons, so the verdict is visible before saving.

## Steps

Each step is a small, reviewable commit that leaves typecheck, lint and tests green.

### 1. Store the CV and preferences (done)

Built with the legacy pdf.js build: the modern one needs a newer JavaScript feature than the Node
used for tests provides, and the legacy build works the same in the browser.

- Add the CV text, its file name and the preference list to the settings schema in storage.
- Add pdf.js as a dependency (approved). First prove it works inside the extension build: the
  panel bundle, its worker file, and the extension's content security policy. Fix the build before
  building anything on top of it. Keep the PDF reading in its own adapter so the rest of the app
  only sees "file in, text out".
- Share the text-cleaning helper through `src/core` (features must not import each other's
  internals), then use it for the CV.
- Settings view: a file picker for the CV (PDF, `.txt`, `.md`; shows file name and length once
  loaded, with Replace and Remove), and a multi-line preferences box. Reject unsupported file
  types, files with no readable text, and text over the 6,000-character cap, each with a clear
  inline message.
- Tests: cleaning, the size cap, preference parsing (trim, drop blanks, dedupe), and reading a
  small scrubbed sample PDF (no personal data in the fixture).
- Done when: the CV and preferences survive closing the panel and nothing else in the app changes.

### 2. Add the three fields (done)

The fields use a new field source, "assessment", rather than "ai": extraction stays untouched
(the extraction schema is built from "ai" fields only) and the form skips them by that source, with
no extra flags. Step 3 builds the assessor's output schema from the same source.

- Add the CV fit, preference fit and verdict fields to the field list (verdict as an enum with the
  four levels). Rely on the derived schemas and sheet mapping; add no field names elsewhere.
- Mark them as display-only so the form skips them but still carries their values to Save.
- Check the row mapping and the formula guard handle multi-line text and the verdict labels.
- User action: add the three column headers to the sheet (and a dropdown for the verdict if wanted).
  Saving fails with the existing "missing columns" error until they exist.
- Tests: field-driven schema and row-mapping tests extended; a sheet round trip with the new
  columns.
- Done when: a job can be saved with these values and read back.

### 3. The assessor

- A new port for "judge a job against a CV and preferences", and an OpenAI adapter beside the
  existing extractor, using the same patterns (structured output, `store: false`, typed errors,
  the model from settings or config).
- Prompt: a short rubric for the verdict, the three-way preference answer, English output, and the
  untrusted-page-text rule. Tuned on the saved Jobstreet fixtures with hand-written answers, as
  was done for extraction.
- Tests: prompt shape (page text only in the user message), schema validation, error mapping, a
  hostile posting that tries to set the verdict.
- Done when: the adapter returns validated values for a payload, a CV and preferences.

### 4. Wire it into Analyze

- In the Analyze flow, run the assessor in parallel with extraction when a CV or preferences exist;
  skip it otherwise. An assessor failure must not lose the extracted form: show the form and a
  clear "assessment failed, try again" message.
- Existing saved job: return its stored assessment. Re-analyze runs the assessor again and replaces
  the stored one (a stale assessment is not worth keeping).
- Make the saved draft remember the assessment so reopening the panel restores the card.
- Tests: with and without a CV, assessor failure, existing row, re-analyze.
- Done when: Analyze returns form values plus an assessment in the same result.

### 5. The card

- A bordered card at the bottom of the form, below the Notes input (see Decisions): the verdict
  first (with a clear level indicator), then the CV fit text, then one row per preference with a
  yes, no or not-stated mark. Narrow, single column, dark mode safe, using semantic tokens.
- Hidden when there is no assessment; a short loading state while it runs.
- Done when: the card matches what is saved to the sheet.

### 6. Docs, polish and release

- PRD: add the feature to product decisions and the roadmap; move "analyze with CV" out of any
  non-goal wording.
- ARCHITECTURE: one short paragraph on the assessor and where the CV lives.
- CLAUDE.md: extend the "never log secrets or page content" rule to the CV and preferences.
- Manual checks with a real key on several real postings; tune the rubric if the verdicts feel off.
- Bump the version (minor).

## Risks

- **Verdict consistency.** The model may rate the same job differently between runs. A tight rubric
  helps, and this needs tuning on real postings.
- **Old rows.** Rows saved before this feature have empty assessment cells until re-analyzed.
- **Stale after a CV change.** Saved verdicts do not update when the CV changes; re-analyzing a job
  refreshes it. A bulk re-assess is out of scope.
- **Cost.** One extra request per Analyze, with the CV in each request.
- **PDF reading in an extension.** pdf.js needs a separate worker and has to run under the
  extension's content security policy. Step 1 proves this first. If it cannot be made to work
  cleanly, fall back to text files only and revisit.
- **PDF text quality.** Multi-column or designed CVs can come out in a jumbled order. Raw text is
  acceptable here (the model reads it), but the user should skim the loaded CV once.

## Open questions

None right now. Resolved with the user: PDF is supported and a new dependency is fine; the CV cap
is 6,000 characters; the card always sits at the bottom of the form, below the Notes input.
