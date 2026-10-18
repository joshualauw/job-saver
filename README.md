# Job Saver

A Chrome side-panel extension that turns "read a job posting, copy details into a spreadsheet" into
"click, glance, save". AI fills in the fields, you review them, and one click writes a row to your
own Google Sheet. It can also check a job against your preferences.

This is a personal project, built step by step with Claude Code. It runs entirely in your browser:
no backend, no accounts, no tracking. You bring your own OpenAI key and your own Google Sheet.

<!-- Add a screenshot or short GIF of the side panel here. Do not show your API key, CV or sheet ID. -->

## What it does

- **Analyze a posting.** On a job page, click Analyze. AI reads the page and fills the tracked
  fields (company, title, location type, salary, skills, summary and more). Anything it can't find
  is flagged "Not found" instead of guessed.
- **Review, then save.** Every value is editable before it goes anywhere. Save adds a row to your
  sheet, or updates the existing row if you saved that job before.
- **Preference check (optional).** Add a list of preferences, either what you want from a job or
  skills and experience you have. Each analysis then also shows a card with a yes / no for each
  preference. What the posting does not mention counts as no.
- **Highlight to narrow it down.** Select part of the page and the button shows how many characters
  it will read.
- **Works on other sites too**, with less accuracy. Jobstreet has dedicated support.

## Requirements

- Chrome (or another Chromium browser that supports the side panel), signed in to a Google account
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
Company	Job Title	Address	Contract Type	Location Type	Platform	Job URL	Min YOE	Skills	Salary Period	Salary Currency	Min Salary	Max Salary	Summary	Notes	Preference Fit
```

The list comes from [`src/config/fields.ts`](src/config/fields.ts), which is the single source of
truth for fields. All headers are required, even if you never use the fit assessment. Settings has a
**Test connection** button that tells you exactly which headers are missing.

Tip: pasting the line above into cell A1 splits it across columns, since the headers are tab
separated. If it lands in one cell, type them in by hand.

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
- **CV and preferences (optional).** Choose a PDF, `.txt` or `.md` CV of up to 6,000 characters, and
  write one preference per line, e.g. "Remote work".

The model name has a default in [`src/config/app.ts`](src/config/app.ts) and can be overridden in
Settings.

## Using it

1. Open a job posting and click **Analyze**.
2. Check the form. "Not found" badges show what the AI couldn't determine.
3. Click **Save**. Open the same job later and the panel shows the saved row, with a
   **Re-analyze** option that refreshes the AI fields and leaves your own columns alone.

On a site without dedicated support, Analyze first asks you to allow Job Saver on that site (one
click, per site). Results are better if you highlight just the job description first.

## Privacy and safety

- Your API key, CV and preferences are stored in your browser only. They never go into the sheet.
- Page text (and your preferences, if set) is sent to OpenAI to do the work, and rows are written to Google
  Sheets. Nothing else leaves your browser. Requests to OpenAI set `store: false`.
- The key is used directly from the browser. That is fine for a personal build; never publish a
  build that contains a key.
- The preference check is an AI reading of the posting, not advice. Read the posting before trusting it.
- Respect the terms of the sites you use this on. It reads the page you are looking at, only when
  you click Analyze.

Each Analyze makes one OpenAI request, or two if you have set preferences.

## Troubleshooting

| Problem                                          | What to check                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google sign-in fails                             | You are signed in to Chrome; your account is a test user; the client's Item ID matches the extension ID; you rebuilt after editing `.env.local`. |
| "The sheet is missing these header columns"      | Add the named headers to row 1 of your tab. Test connection lists them.                                                                          |
| "Job Saver doesn't have access to this site yet" | Click the **Allow Job Saver on ...** button under the message.                                                                                   |
| Values are wrong or empty on another site        | Highlight the job description and Analyze again, or add dedicated support for that site (see ARCHITECTURE.md).                                    |

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
