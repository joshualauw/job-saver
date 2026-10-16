# Product requirements

What Job Saver is for and where it is going. How it is built: [ARCHITECTURE.md](ARCHITECTURE.md).

## Problem

Tracking job applications means reading a posting and copying its details into a spreadsheet by
hand, every time. It is slow, inconsistent, and easy to skip.

## Users

One person: the author, using Chrome and their own Google Sheet. This is a personal tool, not a
product.

## Goals

- Turn "read, copy, paste" into "click, glance, save".
- AI proposes, **the human decides**: every extracted value is visible and editable before saving.
- Zero infrastructure: it runs entirely in the browser and writes to the user's own sheet.
- Adding or removing a tracked field is a one-place change.

## Non-goals (V1)

- No backend, accounts, sync or analytics.
- No auto-apply, bulk scraping or background crawling.
- No Chrome Web Store release.
- No UI for editing the field list.
- No platform other than Jobstreet.

## How it works

1. Open a job posting and click Analyze in the side panel.
2. AI reads the page and fills the tracked fields; unknowns are flagged, not guessed.
3. Review and edit the values.
4. Save: the job becomes a row in the sheet, or updates the existing row for that URL.

## Product decisions

- **Status** moves through Saved, Applied, Interviewing, Offer, Rejected, Withdrawn, Ghosted; new
  jobs start as Saved.
- **Re-saving a known URL** edits the existing row instead of adding a duplicate.
- **Last updated** is blank on a new row and set only when the status changes.
- **One salary figure** is treated as the minimum; the maximum stays empty.
- **Location type** defaults to onsite unless the posting says remote or hybrid.
- **Summary and notes** are written in English regardless of the posting's language.
- **The sheet** (tab and header row) is created by hand.

## Roadmap

1. Scaffold: done.
2. Core logic (fields, schemas, sheet mapping, URL cleaning): done.
3. Page extraction for Jobstreet: done.
4. AI extraction and a minimal API-key field: done.
5. Editable form with "not found" flags, draft persistence, status and date logic: done.
6. Google Sheets: sign-in, append, duplicate lookup, update: done.
7. Settings view and first-run onboarding: done.
8. Polish: toasts, loading states, tab-change handling, dark mode: next.

Outstanding checks on finished work:

- Run extraction against real postings with a real API key and tune the prompt if values are off.
- Confirm in Chrome that Jobstreet pages are readable in a second tab without re-clicking the icon.

## Beyond V1

More job platforms, showing which text each value came from, analyzing only selected text,
an offline save queue, a settings UI for fields, and multiple sheets or profiles.
