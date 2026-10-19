# Job Saver

A Chrome side-panel extension that turns "read a job posting, copy details into a spreadsheet" into
"drop it in, glance, save". Give it the posting as text, screenshots or a file; AI fills in the
fields, you review them, and one click writes a row to your own Google Sheet. It can also check a
job against your preferences.

This is a personal project, built step by step with Claude Code. It runs entirely in your browser:
no backend, no accounts, no tracking. You bring your own OpenAI key and your own Google Sheet.

<!-- Add a screenshot or short GIF of the side panel here. Do not show your API key or sheet ID. -->

## What it does

- **Save a posting from anywhere.** Paste or type the text, highlight it on any page and send it
  from the right-click menu, add screenshots, or add a PDF or text file. It never reads the pages
  you browse, so there is nothing to set up per site.
- **AI fills the form.** Company, title, location type, salary, skills, summary and more. Anything it
  can't find is flagged "Not found" instead of guessed.
- **Review, then save.** Every value is editable before it goes anywhere. Save adds a row to your
  sheet. **Save To** writes the form into a job you saved earlier instead.
- **Preference check (optional).** Add a list of preferences, either what you want from a job or
  skills and experience you have. Each analysis then also shows a card with a yes / no for each
  preference. What the posting does not mention counts as no.

## Requirements

- Chrome 116 or newer (or another Chromium browser that supports the side panel), signed in to a Google account
- Node.js 22.13 or newer, and [pnpm](https://pnpm.io) (`corepack enable` is enough)
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A Google account for the spreadsheet and a Google Cloud project (free) for sign-in

## Setup

### 1. Install

```bash
git clone <this repo>
cd job-saver
pnpm install
```

### 2. Create a Google OAuth client

The extension signs in to Google through Chrome to write to your sheet. You create the credentials
yourself, so nothing is shared with anyone.

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project.
2. Enable the **Google Sheets API** for it.
3. Set up the **OAuth consent screen**: user type External, status Testing, and add your own Google
   account as a test user.
4. Create an **OAuth client ID** with application type **Chrome Extension**. For the Item ID, use
   the extension ID below. It is the same for every checkout because the extension's public key is
   pinned in `wxt.config.ts`.

   ```
   bpbiemlfmenipkbahfkjhchmdllknhpm
   ```

5. Copy the client ID into a `.env.local` file (see `.env.example`):

   ```bash
   cp .env.example .env.local
   # then edit .env.local and set OAUTH_CLIENT_ID=<your client id>
   ```

### 3. Create the spreadsheet

In Google Sheets, create a new spreadsheet with a tab named `Jobs` (or set the name you use in
Settings) and put these headers in row 1. Order does not matter, and you can add your own extra
columns.

```
Company	Job Title	Address	Contract Type	Location Type	Source	Source URL	Min YOE	Skills	Salary Currency	Salary Period	Min Salary	Max Salary	Summary	Notes	Preference Fit	Job ID
```

The list comes from [`src/config/fields.ts`](src/config/fields.ts), which is the single source of
truth for fields. All headers are required, even if you never use the fit assessment. Settings has a
**Test connection** button that tells you exactly which headers are missing.

Tip: pasting the line above into cell A1 splits it across columns, since the headers are tab
separated. If it lands in one cell, type them in by hand.

**Job ID** is how the app recognises a job when you save to it again. It is filled in for you and
never shown in the panel. **Source** says where you found the posting (a dropdown of common
places, or any text you type) and **Source URL** is an optional link; both are yours to fill in.

Coming from version 1? Rename the `Platform` header to `Source` and `Job URL` to `Source URL`, add
a `Job ID` header, and give each existing row a unique Job ID (any short text works). A row without
an ID still holds your data but will not show up in Save To.

New jobs are written into the first empty row that has your formatting, so any dropdowns or formats
you set up on the columns are kept. Past the formatted rows, Google adds new rows for you.

### 4. Build and load the extension

```bash
pnpm build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the
`.output/chrome-mv3` folder. Pin the Job Saver icon to your toolbar.

Rebuild and click the reload button on the extension card after any code or `.env.local` change.

### 5. Configure it

Click the toolbar icon to open the panel. First run opens Settings:

- **OpenAI API key.** Stored only in this browser (`chrome.storage.local`).
- **Google spreadsheet.** Paste the sheet's URL or its ID, and the tab name if it isn't `Jobs`.
- **Test connection** signs in to Google and checks your headers.
- **Preferences (optional).** Write one per line: what you want from a job, or skills and experience
  you have, e.g. "Remote work" or "Node.js and React".

The model name has a default in [`src/config/app.ts`](src/config/app.ts) and can be overridden in
Settings.

## Using it

1. Add the posting in one of three tabs. Only the tab you are on is analyzed, and each tab keeps
   what you put in it while you look at another.
   - **Text:** type or paste it. You can also highlight text on any page, right-click and choose
     **Send to Job Saver**; it opens the panel and fills this tab.
   - **Image:** add up to 5 screenshots (click, drop or paste), in reading order.
   - **File:** add one PDF, `.txt` or `.md` file.
2. Click **Analyze**. A short checklist shows what it is doing: reading the image or file, filling the
   form, and checking your preferences if you set any.
3. Check the form. Empty fields with an orange outline are ones the AI could not determine.
4. Click **Save**, or use **Save to an existing job…** to pick a saved job and overwrite it with the form.
   The button then reads **Update job**.

Once a form is showing, the input folds away under a one-line summary and the button becomes
**Re-Analyze**. It runs the analysis again and replaces the form, so edits you made are lost.

Images and PDFs need a model that can read them, which you can set in Settings. They are only kept
in memory, so they are forgotten when you close the panel. The text tab is remembered.

## Privacy and safety

- Your API key and preferences are stored in your browser only. They never go into the sheet.
- The text, images or file you analyze (and your preferences, if set) are sent to OpenAI to do the
  work, and rows are written to Google Sheets. Nothing else leaves your browser. Requests to OpenAI
  set `store: false`.
- The extension asks for no access to the pages you browse. The only sites it talks to are OpenAI
  and Google.
- The key is used directly from the browser. That is fine for a personal build; never publish a
  build that contains a key.
- The preference check is an AI reading of the posting, not advice. Read the posting before trusting it.
- Respect the terms of the sites you copy postings from.

Each Analyze makes one OpenAI request for text, or two if you have set preferences. Images and PDFs
add one more request to read them.

## Troubleshooting

| Problem                                       | What to check                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google sign-in fails                          | You are signed in to Chrome; your account is a test user; the client's Item ID matches the extension ID; you rebuilt after editing `.env.local`. |
| "The sheet is missing these header columns"   | Add or rename the named headers in row 1 of your tab. Test connection lists them.                                                                |
| Right-click does not show "Send to Job Saver" | The item appears only when text is highlighted. Reload the extension on `chrome://extensions` if it is still missing.                            |
| "Couldn't find any readable text"             | Try a clearer or larger screenshot, or another file. Scanned PDFs with very small text can fail.                                                 |
| "OpenAI rejected the request"                 | The model in Settings may not accept images or files. Try a different one.                                                                       |
| A job is missing from Save To                 | Its row has no Job ID. Give it a unique one in the sheet.                                                                                        |
| Values are wrong or empty                     | Add the posting's full text, including the title, company and pay lines.                                                                         |

## Development

```bash
pnpm dev        # watch build
pnpm test       # unit tests
pnpm lint
pnpm typecheck
pnpm build
```

- [ARCHITECTURE.md](ARCHITECTURE.md): how it is built.
- [CLAUDE.md](CLAUDE.md): the rules the code follows, written for Claude Code but readable by anyone.
