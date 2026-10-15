# Architecture

How Job Saver is shaped and why. What it is for and where it is heading: [PRD.md](PRD.md).
Rules for contributors: [CLAUDE.md](../CLAUDE.md). Details live in the code; this file only
records structure and decisions.

## Overview

A Manifest V3 Chrome extension that lives in the **side panel**. It reads the current job page,
asks OpenAI for structured fields, lets the user review them in a form, and appends or updates a
row in the user's Google Sheet. Everything runs inside the extension; there is no backend.

```
 job page ──inject script──▶ side panel (React) ──▶ OpenAI
                                  │
                                  └──────────────▶ Google Sheets
```

## Stack

TypeScript (strict), WXT (MV3 build), React, Chakra UI v3, react-hook-form + zod, TanStack Query,
OpenAI SDK (Responses API, Structured Outputs), Google Sheets API via `fetch`,
`chrome.identity` for Google auth, `chrome.storage` for settings and drafts, Vitest + happy-dom,
ESLint + Prettier, pnpm.

## Design principles

- **The side panel does the work.** It is an extension page, so it can inject scripts and call
  OpenAI and Google directly. The service worker only opens the panel.
- **Fields are data.** One config list defines every tracked field; the form, validation schemas,
  the model's output schema and the sheet mapping are all derived from it.
- **Deterministic beats AI.** Anything code can derive reliably (platform, clean URL, defaults)
  is never left to the model, and the model cannot override it.
- **Ports and adapters.** OpenAI and Sheets sit behind small interfaces, so core logic is pure and
  testable without network or `chrome`.
- **Validate at boundaries.** Model output, storage, API responses and page data are parsed with
  zod before use.
- **One composition root.** Cross-feature wiring happens in the side panel entrypoint; features
  never import each other.

## Layers

- `src/entrypoints`: the side panel app, the background worker, and the unlisted script injected
  into job pages.
- `src/config`: declarative app knowledge: the field list, platforms (hosts, URL cleaning, page
  selectors) and tunables.
- `src/core`: pure types, schemas, mapping and errors. No `chrome`, `fetch` or `openai`.
- `src/features`: vertical slices (page extraction, AI extraction, form, sheet sync, settings),
  each owning its components, hooks and adapters.
- `src/lib`: thin wrappers around browser APIs and small utilities.
- `src/theme`: Chakra configuration.

## Flow

1. The user opens the panel on a job page and clicks Analyze.
2. A bundled script injected into the tab returns a payload: URL, title, labelled facts read via
   platform selectors, cleaned ad text, and any JSON-LD. A deliberate text selection takes
   precedence; unknown sites fall back to generic page text.
3. Code derives platform, clean job URL and defaults.
4. OpenAI returns the AI-owned fields as strict JSON; unknowns are `null` (lists are `[]`).
5. The result is merged (code-owned fields win), validated, and loaded into the form with missing
   fields flagged. Drafts persist in session storage.
6. The user edits and saves.
7. The sink maps values to columns by header name, looks the row up by job URL, then appends or
   updates it.

## Integrations

**OpenAI.** Structured Outputs with a schema generated from the field list, so the model can only
return known fields and enum values. Requests set `store: false`. The API key is stored locally and
used from the browser, which is acceptable only because the extension is personal and unpublished.
The model name is configuration, not code.

**Google Sheets.** Auth through `chrome.identity` using the Chrome-signed-in account. Columns are
matched by header name, so the sheet can be reordered or extended freely, and a missing header is
a clear error. Rows are identified by job URL, which is what makes edit mode and status-change
tracking possible. Sheet text is guarded against formula injection.

One-time setup (by the user): Google Cloud project with the Sheets API enabled, OAuth consent
screen in Testing mode with the user as a test user, a Chrome-extension OAuth client bound to a
fixed extension ID (manifest `key`), and a sheet tab whose row 1 contains the column names from
the field config.

## Security and permissions

- Page content and the API key go only to OpenAI and Google.
- Page text is untrusted: it is fenced in the user message and never enters the system prompt.
- Permissions stay minimal. Supported platforms get static host access because the panel outlives
  tab switches while `activeTab` does not; other sites work only after the user clicks the toolbar
  icon on that tab and otherwise fail with a clear error.

## Testing approach

Pure logic and adapters are unit-tested with Vitest, with `fetch` and OpenAI mocked. Page
extraction is tested against saved real pages (`tests/fixtures`) loaded into happy-dom with
scripts disabled, so selector drift in our config is caught; refresh the fixtures if a live site
changes. There is no end-to-end browser automation.
