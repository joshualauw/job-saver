# Plan: text-first Job Saver (v2.0)

Temporary tracking file. Delete it when the work is done. It is the reference for this change: if
instructions change, update this file first (decisions log at the bottom), then the code.
Status: `[ ]` todo, `[~]` in progress, `[x]` done.

## Direction

The app stops being a job-page scraper and becomes **text in, structured row out**:
text (selection, paste, image, file) -> AI -> review form -> Google Sheet row.

Decisions already made:

- **Job ID is the row identity**, not the URL. A new internal ID column in the sheet; the ID is
  minted when the draft is created and kept in the draft, so Save is idempotent.
- **Save + "Save To"**: Save creates a job (or updates the one the draft already has). Save To picks an
  existing job from a searchable list and writes the form into it. No dedupe, no upgrade logic, no
  form-prioritisation or per-source behaviour for now. The form simply wins.
- **Platform and Job URL are plain user input**: platform is a dropdown (common platforms plus
  Other), URL is optional and entered and cleaned by the user. No detection, no normalisation. The AI
  never sets them.
- **Selection-only page analysis**: no whole-page reading, no per-site selectors, no platform
  fixtures, no host-permission flow. Other inputs (paste, image, file) feed the same text box.
- Images and PDFs go to OpenAI as image/file input (no OCR library, no new dependency without asking).
  DOCX is out of scope.
- Big bang is fine, but keep commits small and focused (conventional commits), one phase at a time.

## Phase 1: Job ID and Save To

- [x] Add a code-owned Job ID field to the field list; alphanumeric only (formula guard safe).
- [x] Mint the ID when the draft is created and keep it in the draft and its persistence.
- [x] Sink: replace lookup-by-URL with a list of jobs (ID, company, title, platform, URL) and make save an
      upsert by ID. New jobs still go in the first empty formatted row.
- [x] One-time backfill of IDs for existing rows (an explicit "Add missing Job IDs" button in Settings).
- [x] Simplify analyze: drop the sheet lookup, the "already saved" branch, refresh and the saved-row merge.
- [x] UI: Save button plus a Save To searchable combobox ("Company - Title"); choosing a row swaps the
      draft's ID. Show legacy platform strings as they are.
- [x] README sheet headers and the header-sync test; tests for sink, analyze and draft.
- [x] Try it against a copy of the real sheet before touching the live one.

## Phase 2: Platform and URL become user input

- [ ] Platform becomes a dropdown field (common platforms plus Other), URL an optional field; both user-owned
      and nullable.
- [ ] Form inputs, with a light http(s) check on the URL and inline errors.
- [ ] Formula-injection guard still covers both.
- [ ] Tests for the field definitions and form validation.

## Phase 3: Selection-only, remove page analysis

- [ ] Replace page reading with "get the current selection" (context-menu item and/or the Analyze button).
      Check that line breaks survive the capture; pick the method that keeps them.
- [ ] Delete platform config, host matching, URL cleaning, job-source resolution, DOM-text cleaning, JSON-LD,
      the page-extract internals and the platform fixtures and their tests.
- [ ] Remove the optional-host-permission flow and the static host access from the manifest; keep only what
      selection capture needs.
- [ ] Shrink the page payload to text plus optional title; drop facts, JSON-LD and content source.
- [ ] Simplify the prompts: no facts or page-URL sections, and reword the site-specific location rule.

Ordering note: if you never want to be without a way to input text, build the Phase 4 text box before
this phase.

## Phase 4: One text input, plus paste, image and file

- [ ] One editable input text box ("what the AI will see") with a character count; selection and paste fill it.
- [ ] Image/PDF to text adapter using OpenAI image/file input; extend the structured request to accept
      content parts; clear error when the chosen model cannot read images/files.
- [ ] Plain text and markdown files; drag-drop and clipboard image paste.
- [ ] Tests (OpenAI mocked) for the adapter and the text-to-payload builder.

## Phase 5: Docs and release

- [ ] Rewrite ARCHITECTURE.md (data flow, code map, permissions, security) and the README.
- [ ] Update CLAUDE.md rules that no longer hold (site-specific config, unlisted page-reading script, fixtures).
- [ ] Bump to 2.0.0; `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.
- [ ] Delete this file.

## Risks and notes

- Phase 1 writes to the user's live sheet: test on a copy first.
- Phases 2 and 3 both change the field list and the prompt; do not run them in parallel.
- Selection capture may flatten line breaks depending on the method; verify early.
- Sites that block text selection are covered by the image input (screenshot).
- Docs describe intent, not code (CLAUDE.md): keep this file free of code and field lists too.

## Decisions log

- Initial plan agreed. Open question: should analysis only start from an explicit action (button or
  context-menu click), never automatically on selection? Leaning explicit, to avoid accidental OpenAI calls.
- Phase 1 built (typecheck, lint and tests pass; the Save To picker and the backfill button were then tried
  in the browser against a real sheet and work). Choices made while building:
  the saved-jobs list loads once a form is on screen (not at panel open), so Google's sign-in prompt follows a
  user action; the main button reads "Update job" when a target is picked; drafts restored from before job IDs
  existed get an ID on restore.
