# 20: Contract and cleanup

**What to build:** With every page on the new store and shell, the compatibility layer in the app
provider is removed, dead components and hooks found in the audit are deleted,
and lint ignores the generated service-worker files.

**Blocked by:** 15, 16, 17, 18, 19

**Status:** ready-for-agent

- [ ] The provider exposes only the roster, tournaments, matches, and engine-backed actions; old method names are gone.
- [ ] Dead components and hooks named in the audit are deleted and nothing imports them.
- [ ] Lint on the whole repo reports zero errors and the generated service-worker files are ignored.
- [ ] Type check and every test pass.
