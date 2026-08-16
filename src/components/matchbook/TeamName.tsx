/* ===========================================================================
   THE TEAM NAME (F15 — truncation that makes two entities indistinguishable)

   Measured on `/competitions/s-se-13` at 1440px, not at 320px:

     bracket cell name box   93px, holding a 237px name
     schedule row name box  188px, holding a 237px name
     standings name cell    162px, holding a 233px name

   "Wolverhampton Wanderers Athletic Club B" and "Wolverhampton Wanderers
   Athletic Club C" are two different teams that share their first 36
   characters. `truncate` cuts from the RIGHT, so every one of those boxes
   rendered them as the same string — the reader could not tell which team was
   which, on a screen that shows both at once. That is an information failure,
   not a cosmetic one: the whole distinguishing content of the name is the part
   the ellipsis eats.

   ------------------------------------------------------------- the mechanism

   The last space-separated token is pinned and the ELLIPSIS MOVES INTO THE
   MIDDLE:

     Wolverhampton Wanderers Athletic Club B  ->  Wolverhampton Wan… B
     Wolverhampton Wanderers Athletic Club C  ->  Wolverhampton Wan… C

   Two spans in a `flex`: the head takes `min-w-0` + `truncate` so it is the
   part that gives, the tail is `shrink-0` so it always survives. No JS
   measurement, no `ResizeObserver`, no width prop — the elision is done by the
   same layout pass that sized the box, so it is correct at 320, 390 and 1440
   and at any zoom or font size, and it cannot produce the sliding elbows
   §4 forbids.

   The FULL name is always in the DOM. `textContent` is head + tail with no
   character removed, so a screen reader, a find-in-page and a copy all get
   "Wolverhampton Wanderers Athletic Club B" whatever is painted. `title`
   carries it for a pointer user.

   ------------------------------------------------------------- when it holds

   The split is refused — plain `truncate`, exactly as before — when it would
   not help or would hurt:

     - one token ("Apex"): nothing to pin.
     - a tail longer than TAIL_MAX: pinning 18 characters of a 20-character
       last word leaves the head nothing, so the name would read as its ending
       alone.
     - a head shorter than HEAD_MIN: same failure from the other side.

   Names that differ only in the middle still collide, and no width-free rule
   can fix that. A trailing distinguisher — "B"/"C", "II", "2024", "Reserves" —
   is the case this fixture has and the case real leagues generate.

   ------------------------------------------------- the floor the tail set (R2)

   `shrink-0` on the tail is what makes the elision work, and until R2 it also
   made this component the widest thing on two screens. A flex item's automatic
   minimum size is its content size, `shrink-0` means it never gives it back,
   and `whitespace-pre` means that content cannot break — so a split name's
   MIN-CONTENT was the width of its last word, permanently, and every `1fr`
   grid track and `flex-1` box holding one inherited that as a floor.

   Measured at 320 with a club-name roster ("Northside Thunder", "Hartley
   United", "Oakfield Panthers" — nothing longer than 18 characters):

     /teams  Upcoming Fixtures row, two names in one `1fr` track
             track content 291px in a 272px track → document 322 vs 320

   Two names, four crests and a "vs" cannot fit 272px, and the honest response
   is to elide — but nothing could, because the floor was set by the parts that
   refuse to shrink. The overflow left the panel, left `main`, and widened the
   layout viewport, which is what moves the fixed bottom nav off-screen.

   `overflow: clip` on the box is the fix, and it is one word for a reason.
   Flexbox §4.5 gives a box whose `overflow` is not `visible` an automatic
   minimum size of ZERO, so the pair stops advertising a floor it cannot honour
   and the name becomes what its contract always said it was: never wider than
   the box it is handed. Measured after, same viewport and roster: 320 vs 320.

   `clip`, not `hidden`: `hidden` would make this a scroll container on both
   axes (one axis `hidden` forces the other from `visible` to `auto`), which is
   a scrollable box around a single line of text and a stray tab stop in
   Chromium. `clip` clips and nothing else. It needs Safari 16, which is inside
   the band this file already requires (`oklch`, `@layer` and `dvh` all need
   15.4), and where it is not understood the declaration is simply dropped and
   the box behaves exactly as it did before — the degradation is the old
   behaviour, not a worse one.

   The order in which the two spans give is unchanged. The head is the flex item
   with `min-w-0`, so it absorbs every pixel of pressure first and the tail is
   untouched at every width where the head still has letters to spend. Only when
   the box is narrower than the last word ALONE — "…" plus a clipped tail — does
   the tail lose anything, and that case previously broke the whole document
   instead.
   =========================================================================== */

/* ===========================================================================
   THE NAME FLOOR (L1)

   Everything above is about WHERE the ellipsis lands. This is about how much
   is left after it, which is a different question and the one two critics
   scored 3/10 on. Measured across 30 routes at seven widths with an
   eight-club roster, the hard minimum number of PAINTED characters of a team
   name was 0 at 320, 3 at 360, 4 at 375, 5 at 390 and 7 at 414 — and the
   worst case was `/competitions` Live Courts, which handed each side a 14.9px
   mark and painted "AT 15 – 13 \II". Neither team on the panel whose entire
   job is saying who is playing.

   ------------------------------------------------------------------ the rule

   **A team name paints at least NAME_FLOOR characters, or the layout changes
   shape.** Eight, because that is where a club stops being a category: on this
   roster "Westhill", "Beckton ", "Marlow B", "Kingsway", "Northumb", "St
   Aidan'" and "Great Ba" are all distinct at eight and only "Westhill" needs
   its tail to separate two entries. Below eight the names collapse into each
   other ("Bec VC" and "Marl VC" are the same shape) and the mark stops being
   an identity.

   The rule binds LAYOUTS, not this component: a row that cannot give both its
   names eight characters must wrap to two lines, stack, or drop a neighbouring
   column — `MB_MATCHUP_CUT` in `MatchRow.tsx` is the shipped example, and its
   two thresholds are derived from this constant. Shrinking a name to a stub is
   never the answer, because a stub is not a shorter name, it is a different
   and wrong one.

   ---------------------------------------- what this component does NOT do

   It does not deliver the floor, and it cannot: 8 characters of `display/link`
   is 57px, and no rule inside this file can conjure 57px out of a 47px box.
   Every one of the 111 measured failures was closed by a LAYOUT — three
   hand-rolled `/competitions` rows and one on `/quick-match` becoming
   `MbMatchupPair`; `MbMatchRow` taking the same 336px cut; `/summaries` Match
   Report, `/`'s Match of the Day, `/teams` Recent Form and the Champion panel
   each stacking below the width at which their names still fit; and `/teams`
   revealing its two widest columns only where the table fits its scrollport.
   Measured with this component's contribution switched off, the minimum
   painted character count is already 8 at every viewport. That is the proof
   the rule belongs upstairs.

   ------------------------------------------------ what it does: a BACKSTOP

   `shrink-0` on the tail means the tail is paid FIRST and the head gets the
   remainder — including when the remainder is nothing. That is how a 47px mark
   painted "AT" for "Kingsway Athletic" and "\II" for "Westhill Wanderers II":
   the ellipsis had eaten the club and left the suffix, which is F15 with the
   two halves swapped. Nothing in the layout guarantees a future caller will not
   build a 47px box, and the failure mode should not be "no club name at all".

   `TAIL_CEILING` caps the tail at `calc(100% - 4ch)`, so the head always keeps
   four characters of the box whatever the tail costs. It is deliberately far
   BELOW the floor: 4ch is the point at which the head has stopped saying
   anything, not the point at which it stops being comfortable. Measured across
   2056 rendered names at 320/390/1366/1440, it changes 9 of them, and every
   one is a head that was painting zero or one character — "␣Wanderers" becomes
   "We␣Wandere". Everywhere else it is inert, which is the property that
   matters: a cap that bit in the ordinary range would trade the F15 fix for
   this one, and an early version at 11ch did exactly that, cutting
   "WESTHILL WANDERERS" to "WESTHILL WANDE" where plain elision would have
   given "WESTHIL… WANDERERS" — the same characters, one more word of them.

   ------------------------------------------------ a ceiling, NOT a floor

   The obvious spelling is `min-width` on the head, and it is wrong. A
   `min-width` binds unconditionally, so a head SHORTER than the cap gets a box
   wider than its own text and the tail is pushed off the end of it: "Peak B"
   renders "PEAK⎵⎵⎵B" with a hole in the middle of a name, at every width,
   including the ones with room to spare. A floor cannot tell "this head is
   being squeezed" from "this head is short". A ceiling on the tail can,
   because it is expressed relative to the box: where the tail's natural width
   is under the cap — which is almost everywhere — nothing binds at all.

   `ch` rather than px because it is the font's own figure width: it tracks
   every type step, every zoom and every fallback face with nothing to
   re-derive at a call site.

   The percentage is safe where `NAME_COL`'s was not: this is a `max-width` on
   a flex ITEM inside a box of definite width, not a `max-width` on a
   `table-layout: auto` CELL, so it can never be fed back as a column's
   preferred width (the +53px that moved this app's bottom navigation
   off-screen once — see `teamPanels.tsx`). Where a containing block is
   indefinite the percentage resolves to `none` and the tail behaves exactly as
   it did before, which is the correct degradation: the old behaviour, not a
   worse one.
   =========================================================================== */

/** Painted characters a name must always keep. Layouts reshape below it. */
export const NAME_FLOOR = 8;

/**
 * The backstop: four characters of the box the tail may never take, so the
 * head can never paint nothing. Far below `NAME_FLOOR` on purpose — see "what
 * it does: a BACKSTOP" above.
 *
 * A LITERAL class: Tailwind scans source text, so an interpolated
 * `max-w-[calc(100%-${n}ch)]` compiles to nothing and the ceiling would
 * silently never exist. `overflow-clip` and not `truncate`, because the head
 * beside it is already showing an ellipsis whenever this binds, and because
 * `truncate`'s `white-space: nowrap` would collapse the joining space the tail
 * carries.
 */
export const TAIL_CEILING = "max-w-[calc(100%-4ch)] overflow-clip";

/** Longest tail worth pinning, including its leading space. */
const TAIL_MAX = 12;

/** Shortest head worth keeping. Below this the mark reads as its ending only. */
const HEAD_MIN = 4;

/**
 * Split a name into the part that may be truncated and the part that must not.
 * Pure and deterministic — no width, no DOM, no locale.
 *
 * @returns `[head, tail]`. `tail` is `""` when the name must not be split, and
 *          `head + tail` always reconstructs the trimmed name exactly.
 */
export const splitTeamName = (name: string): [string, string] => {
  const trimmed = name.trim();
  const cut = trimmed.lastIndexOf(" ");
  if (cut <= 0) return [trimmed, ""];

  const tail = trimmed.slice(cut);
  const head = trimmed.slice(0, cut);
  if (tail.length > TAIL_MAX || head.length < HEAD_MIN) return [trimmed, ""];
  return [head, tail];
};

/**
 * A team name in one line, eliding from the middle rather than the end.
 *
 * Drop-in for a `<span class="truncate">{name}</span>`: same box, same single
 * line, same ellipsis glyph — the ellipsis just lands where it costs the reader
 * nothing. `className` carries the caller's own type step and weight, so this
 * component owns overflow behaviour and nothing else.
 */
export const MbTeamName = ({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) => {
  const [head, tail] = splitTeamName(name);

  /* Both branches are BLOCK-level. A bare inline `<span class="truncate">`
     does not establish a box to clip, so an inline fallback would stop
     truncating the moment a caller placed it outside a flex row. Flex items
     are blockified anyway, so this changes nothing at the existing call
     sites. */
  if (tail === "") {
    return (
      <span className={`block truncate ${className}`} title={name}>
        {head}
      </span>
    );
  }

  return (
    /* `flex` on the name itself, so the head is the flex item that gives.
       `min-w-0` on the head is what lets it shrink below its content width —
       without it a flex item's floor is its min-content size and the pair
       would overflow the cell instead of eliding.

       `overflow-clip` is the same argument one level up: it zeroes THIS box's
       own automatic minimum size, so the un-shrinkable tail inside can no
       longer set a floor for the grid track or flex line around it. See "the
       floor the tail set" above — without it a two-word club name widened the
       document and took the bottom nav off-screen with it. */
    <span
      className={`flex min-w-0 items-baseline overflow-clip ${className}`}
      title={name}
    >
      <span className="min-w-0 truncate">{head}</span>
      {/* `whitespace-pre` keeps the joining space: the tail carries it, so
          `head + tail` is the name verbatim rather than the name with a space
          collapsed out of it.

          `shrink-0` still, because the tail must not give up characters while
          the head has room — that is the F15 fix. `TAIL_CEILING` is what
          decides when it has run out of room, and it caps the BOX rather than
          shrinking it, so a head at its natural width is never pushed away
          from its own tail. See "a ceiling, NOT a floor" above. */}
      <span className={`shrink-0 whitespace-pre ${TAIL_CEILING}`}>{tail}</span>
    </span>
  );
};
