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
   =========================================================================== */

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
       would overflow the cell instead of eliding. */
    <span className={`flex min-w-0 items-baseline ${className}`} title={name}>
      <span className="min-w-0 truncate">{head}</span>
      {/* `whitespace-pre` keeps the joining space: the tail carries it, so
          `head + tail` is the name verbatim rather than the name with a space
          collapsed out of it. */}
      <span className="shrink-0 whitespace-pre">{tail}</span>
    </span>
  );
};
