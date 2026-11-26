# Tournament Tracker

Next.js 16 / React 19 / TypeScript app for organizing and scoring tournaments, backed by Firebase Auth and Firestore.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout, with one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Design system

Every screen is built from the role tokens and the shared classes in `src/app/globals.css`: white cards on a grey ground, Figtree, the four-step radius scale, one green for the next thing to tap, red for destructive actions only, and the one icon sprite. See `docs/design-system.md` before touching UI; it has the tokens, which button to use, the dialog recipe, and what is forbidden. The guard test `src/__tests__/design/tokens.test.ts` fails on anything from the forbidden list that a pattern can catch.
