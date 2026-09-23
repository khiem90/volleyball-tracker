# Deploying Firestore rules and indexes

The app's security rules live in `firestore.rules` and its composite indexes in
`firestore.indexes.json`. Vercel deploys the web app but knows nothing about
Firestore, so after a change to either file you push them to the Firebase
project with the Firebase CLI. The CLI is already a dev dependency, so every
command below runs through `npx`.

## Before you deploy

Run the rules tests against the emulator so a broken rule never reaches
production. In one terminal:

```bash
npm run emulators
```

In another:

```bash
npx vitest run
```

vitest skips the rules tests with a message when the emulator is down, so
check that the output says they ran.

## Steps

1. Sign in to the Firebase CLI. This opens a browser window once and caches the
   credential on your machine.

   ```bash
   npx firebase login
   ```

2. Find the project id. It is under Project Settings > General in the Firebase
   Console, and `npx firebase projects:list` prints every project you can see.

3. Deploy the rules and the indexes together, replacing `PROJECT_ID`:

   ```bash
   npx firebase deploy --only firestore:rules,firestore:indexes --project PROJECT_ID
   ```

   To deploy just one of them, drop the other from the `--only` list.

4. Check the result in the Console. Firestore > Rules shows the new ruleset at
   the top of its history within a minute. Firestore > Indexes lists any new
   composite index as Building until it is ready, which can take several
   minutes on a large collection.

## Notes

- `npx firebase use --add` writes a `.firebaserc` so later commands can skip
  `--project`. That file is fine to commit if the project id is not sensitive
  to you; otherwise keep passing `--project`.
- The deploy replaces the whole ruleset and overwrites any rule edited by hand
  in the Console, so treat `firestore.rules` in this repo as the only source.
- Deleting an index from `firestore.indexes.json` and deploying asks before
  removing it from the project. Answer no if a query in production still
  depends on it.
