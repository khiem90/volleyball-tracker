#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
#
# A cloud session can start on a detached HEAD, so the first commit has no
# branch to land on. This script puts the checkout on a claude/session-* branch
# when that happens and leaves an existing branch alone. It then installs the
# npm dependencies when node_modules is missing, so lint and tests work at once,
# and says whether a Java 21+ runtime is on PATH, which the Firestore emulator
# needs for the rules tests. It only runs in remote sessions, never fails the
# session, and is safe to run again.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if git rev-parse --git-dir >/dev/null 2>&1; then
  if [ -z "$(git branch --show-current 2>/dev/null)" ]; then
    branch="claude/session-$(date -u +%Y%m%d-%H%M)"
    if git switch -c "$branch" >/dev/null 2>&1; then
      echo "session-start: HEAD was detached; created and switched to branch $branch" >&2
    else
      echo "session-start: HEAD is detached and creating branch $branch failed; create one by hand before committing" >&2
    fi
  fi
fi

if [ ! -d node_modules ] && [ -f package-lock.json ]; then
  echo "session-start: node_modules missing; running npm ci" >&2
  npm ci --no-audit --no-fund >&2 || echo "session-start: npm ci failed; run it by hand before lint or tests" >&2
fi

# `java -version` writes to stderr, e.g. `openjdk version "21.0.4"`. Java 8 and
# older report as "1.8.0", so the second number is the major there.
java_version=$(java -version 2>&1 | sed -n 's/.*version "\([0-9][0-9.]*\)".*/\1/p' | head -n 1)
java_major=${java_version%%.*}
if [ "$java_major" = "1" ]; then
  java_major=$(echo "$java_version" | cut -d. -f2)
fi
if [ -z "$java_major" ]; then
  echo "session-start: java not on PATH; the Firestore emulator (rules tests) cannot run" >&2
elif [ "$java_major" -lt 21 ] 2>/dev/null; then
  echo "session-start: java $java_version on PATH but the Firestore emulator needs 21 or newer" >&2
else
  echo "session-start: java $java_version on PATH; the Firestore emulator can run" >&2
fi

exit 0
