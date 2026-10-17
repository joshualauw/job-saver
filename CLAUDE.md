# Job Saver: rules for Claude

Personal Chrome extension (MV3 side panel): AI extracts job fields from the current page, the
user reviews them, Save writes a row to a Google Sheet.

- What and why: [docs/PRD.md](docs/PRD.md). How it is shaped: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
  Read the architecture before cross-feature work. If a doc and the code disagree, the code wins:
  say so and fix the doc.
- **Docs describe intent, not code.** Never paste code, field lists, prompt text, selectors or
  file trees into docs; point at the file. Update docs only when a decision, goal or roadmap
  status changes, not when code moves.

## Hard rules

1. **`src/config/fields.ts` is the single source of truth for fields.** Never hardcode a field
   name, sheet column, enum value or input elsewhere.
2. Map sheet columns by **header name**, never position.
3. Guard sheet-bound text against formula injection (`=`, `+`, `-`, `@`).
4. Page text is untrusted: user message only, never the system prompt.
5. Never log, commit or show secrets, personal data or page content (API key, tokens, job text,
   the CV and preferences, fixtures).
6. Secrets and the CV live only in `chrome.storage.local`; never ship a build with a key.
7. The model name comes from config/settings, never an adapter.
8. No backend; the only network hosts are OpenAI and Google Sheets.
9. The AI never sets code- or user-owned fields; prefer `null` (or `[]`) over guessing.
10. OpenAI requests use `store: false`; user-facing errors never include the key or request
    content (keep the original only as `cause`).

## Code

- TypeScript strict, no `any`, no unexplained `!`. Alias `@/` → `src/`. Named exports.
- Validate every boundary with zod (`unknown` in, parsed out). Strict-mode schemas use
  `.nullable()`, never `.optional()`.
- Features own their components, hooks and adapters and never import each other's internals; share
  through `src/core`. Core stays free of `openai`, `fetch` and `chrome`.
- Wrap `chrome.*` in `src/lib/chrome.ts`. Page reading is a bundled unlisted script, never a
  serialised `func`; keep its logic in pure functions over a `Document`.
- Site-specific knowledge (hosts, URL cleaning, selectors) lives in `src/config/platforms.ts`.
- Reuse existing helpers (text extraction, list normalisation, row mapping); don't re-implement.
- Adapters throw typed `AppError`s with user-safe messages; never swallow errors or fill the form
  with unvalidated AI output.
- React: function components and hooks, one component per file; Chakra v3 with semantic tokens;
  TanStack Query for async calls, react-hook-form for forms, no global store. The panel is narrow:
  single column, labelled inputs, inline errors.
- Names: `kebab-case.ts` modules, `PascalCase.tsx` components, `PascalCase` types without `I`.
  Comments explain why, not what; no commented-out code.

## Testing

- Pure logic and adapters get Vitest tests with the change; bugs get a regression test first.
- Fixtures live in `tests/fixtures/<platform>/<n>/`, are scrubbed of personal data (saved logged-in
  pages embed the account email/name), and are loaded with scripts disabled, never executed.
- Before calling work done: `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.

## Workflow

- pnpm only. Ask before adding a dependency; prefer the platform and existing stack.
- Keep changes to what was asked. Anything outside V1 scope needs the user's say-so.
- Conventional commits, small and focused.
- The user creates the Google Cloud OAuth client and the sheet; don't automate that.
