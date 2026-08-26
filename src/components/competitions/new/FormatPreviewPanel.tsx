"use client";

import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { FORMAT_META } from "@/components/matchbook/formatMeta";
import type {
  MbPreviewBasis,
  MbPreviewLine,
} from "@/components/matchbook/useMatchbookNewCompetition";
import type { CompetitionType } from "@/types/game";

/* ===========================================================================
   FORMAT PREVIEW

   What the chosen format will actually generate, in the user's own numbers.
   It is shared by step 1 (where it justifies the choice) and step 3 (where it
   is the last thing read before the competition is committed, and where it
   fills the 380x930 column of empty paper the details sheet used to leave
   beside `Advanced Settings`).

   Two things it will not do:

   1. **It will not print zeros.** On arrival it used to read ENTRANTS 0 /
      MATCHUPS 0 / MATCHES 0, because every line ran through `entryCount` and
      no team is entered until step 2. A panel whose job is to justify a
      decision asserting three false facts at the moment of the decision is
      worse than no panel. `MbPreviewBasis` names what the arithmetic ran on
      and the caption says so, so a projection is legible AS a projection.
   2. **It will not animate the numbers.** The panel body is keyed on the
      format, so choosing one replays `.mb-enter` over the whole block — one
      settle, once per decision. The figures themselves never flip or spring;
      they arrive with the panel that explains them.
   3. **`format` is not nullable.** The panel is not rendered at all until
      there is something to preview (`FormatStep`) — never an empty state
      restating the choice the reader is about to make — and it arrives WITH
      the answer, as the reward for choosing. Step 3 always has a format.
   4. **It will not print a bare participle.** The head's right-hand label is
      `MbPreviewBasis.label`, a NUMBER AND A NOUN ("8 teams entered",
      "12 teams projected") or the empty string when there is nothing to
      label — in which case the head simply carries its title.
   =========================================================================== */

export const FormatPreviewPanel = ({
  format,
  lines,
  basis,
}: {
  /** Never null: the panel is not rendered until a format exists (note 3). */
  format: CompetitionType;
  lines: MbPreviewLine[];
  basis: MbPreviewBasis;
}) => (
  <Panel
    title="Format Preview"
    tone="navy"
    icon="bracket"
    meta={
      basis.label ? (
        <span className="matchbook-display text-[0.66rem] mb-track-status font-bold text-mb-paper-bright tabular-nums">
          {basis.label}
        </span>
      ) : undefined
    }
  >
    <div key={format} className="mb-enter">
        <p className="border-b border-mb-rule px-4 py-3 text-[0.85rem] leading-[1.5] text-mb-ink-muted">
          {FORMAT_META[format].blurb}
        </p>
        {basis.source === "none" ? (
          <PanelEmpty message="No teams exist yet — the schedule this format generates is worked out once teams are entered." />
        ) : (
          <>
            <dl className="divide-y divide-mb-rule">
              {lines.map((line) => (
                <div
                  key={line.label}
                  className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3"
                >
                  <dt className="mb-kicker min-w-0 truncate">{line.label}</dt>
                  <dd className="matchbook-display shrink-0 text-[0.95rem] mb-track-title font-bold tabular-nums">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-mb-rule px-4 py-3 text-[0.78rem] leading-snug text-mb-ink-muted tabular-nums">
              {basis.caption}
            </p>
          </>
        )}
    </div>
  </Panel>
);
