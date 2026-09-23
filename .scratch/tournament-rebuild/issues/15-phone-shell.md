# 15: Phone shell

**What to build:** Every page has a fixed bottom tab bar (Home, Teams, Tournaments, History) padded
above the iPhone home indicator and a top bar with the account menu and sign-out.
The old navigation is removed everywhere, including the volleyball tools pages,
which keep their content but get the new shell. Safe areas are respected, the
manifest stops locking portrait and matches the paper palette, and the app is
light only.

**Blocked by:** 06, 08

**Status:** ready-for-agent

- [ ] At 375px every page shows the tab bar and top bar with no horizontal scroll in either.
- [ ] Sign-out is reachable from every page and clears cached data on that device.
- [ ] The tab bar, top bar, and any fixed toast use safe-area insets; nothing sits under the home indicator or status bar.
- [ ] The manifest has no orientation lock, paper background and theme colors, maskable icons with safe-zone padding, and the viewport uses cover fit.
- [ ] The theme toggle and dark class are removed and the hydration error is gone.
- [ ] The old navigation component and its parts are deleted.
