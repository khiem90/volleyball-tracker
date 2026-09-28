# 18: Shell polish

**What to build:** Page headers wrap instead of clipping at phone width, matchbook styles sit in a
Tailwind layer so utilities win, primary controls across the app meet 44px, and
a new deploy shows a reload banner instead of reloading the app on its own.

**Blocked by:** 15

**Status:** ready-for-agent

- [x] No page header or button row overflows a 375px viewport.
- [x] Utility classes on matchbook elements take effect; the existing important-flag workarounds are removed.
- [x] An audit of primary controls finds none under 44px.
- [x] A newly deployed version shows a reload banner and never reloads mid-scoring on its own.

## Comments

**2026-09-27, implementation.** Done on branch `claude/rotation-lab-redesign`.

- The matchbook rules in `globals.css` sit in `@layer components`, so a
  utility on a matchbook element wins. Every important-flag workaround is
  gone (`pl-3!`, `pr-3!`, `h-auto!`, `px-2!`, `border-b-0!`), and so is
  History's inline `paddingBlock: 0` on its search field. The global
  `:focus-visible`, `::placeholder`, and `::selection` rules moved into
  `@layer base`. Left unlayered, they would have beaten the layered
  matchbook rules. Every `.mb-input` field would have shown a red outline
  on tap, and placeholders would have turned the wrong color.
  `.mb-nav-item` and `.mb-seed-box` had no users after tickets 15 and 16,
  so they went rather than moving into the layer.
- About a hundred utilities on matchbook elements had been losing to the
  unlayered CSS, and they apply now. Most are letter spacing on
  `.matchbook-display` text, table header alignment, and smaller text and
  padding on compact buttons. None of them broke a layout at 375px. The
  ones that would have shrunk a control (`py-1.5`, `py-[0.45rem]`) are held
  at 44px by the minimums below.
- 44px. `.mb-btn`, `.mb-panel-link`, `.mb-input`, `.mb-search`, and
  `.mb-select-native` are 44px tall on their own, and the `min-h-11`
  classes that repeated it are gone. A link in a panel's head fills the
  head's height through a negative margin that matches the head's padding,
  so the head stays 44px tall. A field in `.mb-input` or `.mb-search`
  stretches to the box's full height, so a tap anywhere in the box lands on
  the field. The shadcn Button's default and icon sizes are 44px. So are
  the dialog close button, the team form's text field and color swatches,
  the undo toast's buttons, the top bar's brand link, the delete button on
  a Tournaments row, and sign-in's Forgot Password and Sign Up. In the
  volleyball tools, the Rotation Lab's controls, the formation picker, My
  Formations, a shared formation, the formation editor, and the share
  dialog meet 44px too, with their content otherwise unchanged. At 375px
  the Rotation Lab's six rotations take a row of their own, with Previous
  and Next under them.
- Headers wrap. The titles on Tournaments, Quick Match, Tools, the
  Rotation Lab, Teams, and sign-in lose `truncate` and `whitespace-nowrap`,
  and a tournament's name breaks anywhere, as it does in the console.
  Masthead button rows wrap, and on a phone each button takes its row's
  full width. A panel's head wraps too, which puts Teams' search field and
  Select under the panel's title.
- The reload banner. `src/lib/appUpdate.ts` is the pure part. `nextUpdate`
  takes the service worker's events and the Reload tap and returns what the
  page shows and does. A page reloads only after its own Reload tap. A
  version another tab let in shows the banner in this tab too. The first
  service worker taking over a page is no update. `AppUpdateProvider` in
  `src/context/AppUpdateContext.tsx` feeds it from `navigator.serviceWorker`
  and sits above every page, so the offer survives a move between the shell
  and the scoring page. It also checks for a new version every 30 minutes
  and whenever the page comes back into view, since a browser checks only
  on a full page load. Reload asks the waiting worker to take over, and the
  takeover reloads the page. `UpdateBanner` sits in the flow under the top
  bar and under the scoring header, so it covers no control. Fullscreen
  scoring leaves it out.
- `next.config.ts` turns off next-pwa's reload on reconnect and Workbox's
  `skipWaiting`. The generated worker now waits, and it takes over on the
  banner's `SKIP_WAITING` message. `.gitignore` gains the generated
  `swe-worker-*.js`.
- Tests. `src/__tests__/shell/appUpdate.test.ts` (6 tests) drives
  `nextUpdate` in the shape of the shell, Home, and History tests. Like
  theirs, it is a pure-module seam beside the two that Testing Decisions
  names.

Verified in the browser pane at 375x812, against the emulators, on the dev
server another session left on port 3000. An audit script ran on every
page, signed in on 127.0.0.1 and as a guest on `[::1]`: Home, Teams,
Tournaments, New Tournament, each console tab, Quick Match, History, Tools,
the Rotation Lab, My Formations, sign-in, a tournament's scoring page, and
the guest scoring page. It found nothing past the right edge and no control
under 44px, measuring a field by its box. The Teams and console tables are
wider than the screen, but they scroll inside their panels and the page
does not. The account menu, the End Tournament dialog, the team form, and
the formation editor's 28 controls pass as well. At 1280px the masthead
buttons sit beside the titles again. Typecheck, `eslint src` (0 errors, 13
pre-existing warnings), and the full suite (524 tests) pass with the
emulators up.

The banner was checked on production builds, served by `next start` on
port 3100 with a fresh build between visits. The first install showed no
banner. After the next build the new worker waited, and both open tabs
showed the banner. One tab was on the guest scoring page at 3 to 0. Reload
in the other tab reloaded only that tab. The scoring tab kept its score and
a marker set on its window, and it went on offering the new version. Its
own Reload then reloaded it at once. On the final code a Reload reloaded
the page 138ms after the tap, through the takeover. A dispatched `online`
event no longer reloads the page.

Things seen and left alone. The banner shows in the shell and on the
scoring page only. Sign-in, the match page's "Scorer link replaced" and
"Match not found" frames, and fullscreen scoring don't carry it. The
provider keeps the offer, so the next page that does carry it shows it.
With `:focus-visible` in the base layer, `outline-none` wins, so the shadcn
Button and input show only their own focus ring and no longer the red
outline on top. The name button at the top of a formation card is 24px
tall; Select beside it is 44px and does the same, and ticket 19 reworks
Select. The undo toast was not raised in the browser; its buttons now use
the Button's 44px sizes. `Header.tsx`, `TeamCard.tsx`, `ui/copy-button.tsx`,
and `ui/tabs.tsx` have no users, for ticket 20. The screenshot tool cropped
some captures at twice the pixel ratio, so layout was checked by
measurement. The guest match in the production tabs and the service worker
registered on port 3100 stay in the pane's browser.

**2026-09-27, review.** A two-axis review (standards and spec) ran on the
staged change. What changed after it:

- A comment in `appUpdate.ts` said the banner spares "a scorer", which the
  glossary keeps for someone holding a scorer link. It says whoever is
  scoring a match.
- The panel head's padding and its link's negative margin share two custom
  properties, so they cannot drift apart.
- The Button's `sm`, `icon-sm`, and `icon-lg` sizes had no users, and
  `icon` had grown past `icon-lg`. They are deleted, and the unused copy
  button's size prop lost the two small ones.
- `UpdateEffect` and `UpdateStep` are no longer exported.
- A Reload whose waiting worker disappears before taking over no longer
  sits on "Reloading...". The page reloads after 3 seconds anyway, since
  the tap asked for a reload.

Left as judgement calls. The masthead wrap classes repeat on four pages
rather than living in a shared masthead, since each page's masthead is its
own. The Tools cards use `.mb-panel-link` for a label inside a card link
and cancel its 44px with `min-h-0`, which is the utility winning as this
ticket intends. Deleting `.mb-nav-item` and `.mb-seed-box` is ticket 20's
kind of work, done here because the rules were moving anyway. "Team
Directory", "Manage Event", and "Delete competition" predate this ticket.
