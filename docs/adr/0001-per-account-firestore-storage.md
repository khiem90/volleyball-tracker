---
status: accepted
---

# Per-account Firestore storage replaces Sessions

Roster, tournament, and match data used to live in one localStorage blob per browser. Sharing copied a single competition into a Firestore "session" document and switched the whole app into that session, which limited an account to one tournament, hid every other tournament while a session was open, and lost everything on a new device. We decided that all roster, tournament, and match data lives in Firestore under the owning account, with offline persistence turned on, and that sharing is a property of a tournament rather than a separate container.

## Considered options

- Keep localStorage as the source of truth and mirror one tournament per session document. Rejected: cross-device stays broken, and two sources of truth is what produced the stale-array overwrite bugs.
- Sessions that hold many competitions. Rejected: it keeps the "switch the app into a session" mode that caused the confusion in the first place.

## Consequences

- Sign-in is required for everything except a guest quick match.
- Firestore rules must enforce ownership. The previous `allow update: if ... || true` is gone.
- Existing session and summary data is discarded. The owner confirmed it is disposable.
