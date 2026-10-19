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
- **Source and Source URL are plain user input** (first called Platform and Job URL): source is free text with
  a dropdown of common sources as a template; picking "Other" switches to a manual text input, so it is not a
  strict enum and any value can be saved. Source URL is optional and entered and cleaned by the user. No
  detection, no normalisation. The AI never sets them.
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

- [x] Platform becomes a free-text field (any value is valid, not an enum) with a dropdown of common
      platforms as a template; choosing "Other" reveals a manual text input. A saved value that is not in
      the template (e.g. an old hostname) shows as manual text. URL becomes an optional field; both are
      user-owned and nullable.
- [x] Form inputs, with a light http(s) check on the URL and inline errors.
- [x] Formula-injection guard still covers both.
- [x] Tests for the field definitions and form validation.

## Phase 3: Selection-only, remove page analysis

- [x] Replace page reading with "get the current selection": built as a right-click "Send to Job Saver" item (chosen over the Analyze-button route; no host permissions).
      Check that line breaks survive the capture; pick the method that keeps them.
- [x] Delete platform config, host matching, URL cleaning, job-source resolution, DOM-text cleaning, JSON-LD,
      the page-extract internals and the platform fixtures and their tests.
- [x] Remove the optional-host-permission flow and the static host access from the manifest; keep only what
      selection capture needs.
- [x] Shrink the page payload to text plus optional title; drop facts, JSON-LD and content source.
- [x] Simplify the prompts: no facts or page-URL sections, and reword the site-specific location rule.

Ordering note: if you never want to be without a way to input text, build the Phase 4 text box before
this phase.

## Phase 4: Text, Image and File input tabs

Design changed from the first draft: three tabs with icons (Text, Image, File), no "what the AI will see" box.
Only the Text tab has a textarea (typed text and right-click text land there). Each tab keeps its progress while you
switch; Analyze sends only the active tab. Images and PDFs go through a hidden transcribe step (one vision call to
plain text) and then the same extractor and assessor as text. Icons are inline SVGs.

- [x] Rename selection capture to job input (no behaviour change).
- [x] Transcriber: core types, a plain-text OpenAI request helper, the transcribe adapter; clear error when the model
      cannot read images/files.
- [x] Analyze takes text or media input; media is transcribed first.
- [x] Tabs UI: Text (textarea, count, clear), Image (up to 5, drop/paste/pick, thumbnails), File (one .txt/.md/.pdf).
- [x] Tests (OpenAI mocked) for the transcriber, the analyze flow, attachment reading and the tab-to-input mapping.
- [~] Checked in a browser with a stubbed chrome; real Chrome check (right-click fills the Text tab, image and PDF analysis with a real key) is still for the user.

## Phase 4.5: Clean up legacy and simplify

Remove what only existed to carry the 1.3.0 app forward, and flatten structure that still reflects the old design.
No behaviour change beyond the removals. Keep commits small.

- [x] Remove the Job ID backfill (Settings button, its hook and composition, the sink method, the README note, tests);
      the sheet is already backfilled.
- [x] Remove "saved before X existed" handling: the restored-draft job ID fallback, the old-CV-settings test and
      guard, and any other compatibility code for data shapes from 1.3.0.
- [x] Rename historical names to match what the code does now (page payload, page prompt, page text cap, selection
      helpers become job text), including comments, strings and the package and manifest descriptions.
- [x] Simplify the field config now that platform and URL are user-owned and the job ID is the only code-owned
      field (field sources, hidden flag, "missing" logic).
- [x] Simplify the side panel wiring: App.tsx and the composition files and hooks around it, dropping layers that
      only forward calls and injectable dependencies nothing needs.
- [x] Remove dead code: unused exports and types, wrappers in the chrome helper that nothing calls, and tests for
      behaviour that no longer exists.
- [x] Diff against 1.3.0 for anything else left over (settings, storage keys, permissions, docs claims for Phase 5);
      typecheck, lint and tests pass.

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
- Platform decision changed: "Other" in the platform dropdown triggers a manual text input rather than being an
  enum value; the dropdown is only a template of common platforms, and the stored value is plain text.
- Phase 1 built (typecheck, lint and tests pass; the Save To picker and the backfill button were then tried
  in the browser against a real sheet and work). Choices made while building:
  the saved-jobs list loads once a form is on screen (not at panel open), so Google's sign-in prompt follows a
  user action; the main button reads "Update job" when a target is picked; drafts restored from before job IDs
  existed get an ID on restore.
- Phase 2 built (typecheck, lint, tests pass; the platform control and URL check have not been tried in the
  browser yet). Platform and URL are now user-owned and optional. The page-based prefill of both stays until
  Phase 3 removes detection, so a prefilled value that is not in the template (a hostname) shows as manual text.
- Phase 2 platform control was tried in a browser and crashed the whole panel when "Other" was picked: the manual
  text box shared the field's ID with the dropdown's hidden select, so the dropdown found an input instead of a
  select. Fixed by giving the text box its own ID (it now also takes focus). Verified in a browser for Other
  and for switching back to a template value. Not covered by an automated test: the test DOM (happy-dom) cannot
  render this dropdown.
- Phase 3 built (typecheck, lint, tests pass; the panel's captured-text card and Clear were checked in a browser with a
  stubbed `chrome`). Decision: capture is the right-click menu only, so the extension asks for no host permissions
  (permissions are now storage, identity, contextMenus and the side panel). Still unverified in real Chrome, because
  it cannot be run from here: that the right-click item opens the panel and fills it, and whether the menu's text
  keeps line breaks (check this when trying the build; the model copes with flattened text but bullet lists read worse).
  Left for later: the payload type keeps its old name for now (Phase 4's text-to-payload builder is the place to
  rename it); README, ARCHITECTURE.md and CLAUDE.md still describe page reading and platforms (Phase 5). With no
  text box yet, right-click is the only way to give the panel text until Phase 4.
- Phase 4.5 added: clean up legacy handling from 1.3.0 and simplify the structure before the docs rewrite, so Phase 5
  describes the simpler code. The Job ID backfill goes because the real sheet already has IDs.
- Phase 4 built (typecheck, lint, tests pass). Three tabs (Text, Image, File) with inline SVG icons; each keeps its
  content while you switch and Analyze sends only the active tab; after a save only that tab is cleared. Images and PDFs
  are read by a hidden transcribe call (one vision request), then go through the same extractor and assessor as
  text; text files are read locally. Limits: 5 images of 8 MB, one file of 10 MB. Images and the file live in memory,
  so they are lost when the panel closes; the Text tab is kept in session storage. Checked in a browser with a stubbed
  chrome (tabs, drops, errors, progress kept); the real vision call is covered by mocked tests only. The payload type
  keeps its old name (it is only the posting text now).
- Phase 4.5 done (typecheck, lint, 322 tests pass; restored-draft form and Settings checked in a browser with a stubbed
  chrome). Removed: the Job ID backfill and its sink method, the restored-draft ID fallback, the old-CV settings test and
  prompt guard, the unused sheet-row field on listed jobs. Simplified: the model input is now a plain job text (no
  payload object; "page"/"selection" names became "job text"), the field config has one code-owned source instead of
  derived plus a hidden flag, the form's single draft is the session (no separate Session object), and save and test
  connection share one helper for opening the sheet. A scan found no unused exports, only a few exports nothing outside
  their file used, which were un-exported. For Phase 5, README.md still describes page analysis, "Re-analyze",
  dedicated Jobstreet support, the "Allow Job Saver on this site" prompt, page text and the troubleshooting rows for
  those; ARCHITECTURE.md and CLAUDE.md describe page reading, platforms, selectors and fixtures.
- Renamed Platform to Source and Job URL to Source URL (keys source and sourceUrl, sheet headers "Source" and
  "Source URL"). The field definition property that said who owns a value (ai, user, code, assessment) was renamed
  from source to owner so a field called source does not sit next to it. No compatibility code: the sheet's two
  headers must be renamed by hand in row 1 (Test connection names any that are missing), and a draft stored under
  the old keys loses just those two values. Earlier log entries keep the old names on purpose.
