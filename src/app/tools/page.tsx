"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { getUserFormations } from "@/lib/volleyball/userFormations";
import type { UserFormation } from "@/lib/volleyball/types";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbBadge } from "@/components/matchbook/Badge";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { MbPanelHeadLink } from "@/components/matchbook/panels";

/* ===========================================================================
   TOOLKIT

   The only one of the six that overflowed: `body.scrollWidth` 425 against a
   390 client width, +35px of horizontal page scroll — HF-1, the first hard
   fail in the list. The cause was the hand-rolled masthead: a
   `whitespace-nowrap` `<h1>` and the count badge on one non-wrapping flex line.
   `MatchbookMasthead` wraps and uses `break-words`, so the conversion is the
   fix; there is nothing left here to nowrap.

   ------------------------------------------------------- 1798px, and not an empty state

   This is the TALLEST screen in the build at 390px, and it measures 1798px on
   a brand-new account and 1798px on the full fixture — the same number, to the
   pixel, because a hub of tools has no zero state to have: the four tools exist
   whether or not any data does. So there was nothing here for the collapse
   pattern to collapse, and the height had to be accounted for instead:

     110px  masthead
     906px  the Toolkit launcher          <- HALF THE SCREEN
     249px  Saved Formations (one empty state, one headline — invariant 25
            doing its job, and the screen's only empty-able object)
     326px  Court Reference (a court diagram and its caption — real reference
            content, and the one thing on the page that is not a link)

   The launcher was 906px because each of four destinations was drawn as a
   226px POSTER CARD — a 44px icon disc, a title, a two-line description, and
   an "Open Tool" chevron under it — stacked one per line. That card is right
   at `sm` and above, where `grid-cols-2` / `xl:grid-cols-4` tile four of them
   into one 200px band and the poster is the panel. At 390 the same markup is
   four posters in a column, and a poster in a column is a list row with 160px
   of air around it.

   So the launcher takes the app's own ruled-row grammar below `sm` — the same
   glyph + title + gloss row `Recent Competitions` and `Saved Formations`
   already print on this very screen — and keeps the card grid from `sm` up
   untouched. One markup, two forms, and the breakpoint is where the grid it
   was designed for actually exists.

   Measured: 906px -> 336px, and DESKTOP IS UNCHANGED at 722px of content,
   because every card class is behind `sm:`.

   Worth recording and not fixed here, because it is a product decision rather
   than a composition one: two of the four "tools" are not tools. `/quick-match`
   and `/competitions/new` are primary destinations that the bottom bar renders
   on this same 390px screen and the rail renders at `lg`, and `My Formations`
   is the "Manage All" head link of the panel directly below the launcher. The
   hub restates navigation it is already sitting next to.
   =========================================================================== */

const TOOLS = [
  {
    icon: "court",
    title: "Rotation Designer",
    description: "Design 5-1 and 6-2 volleyball rotations and check overlap rules.",
    href: "/tools/volleyball-rotations",
  },
  {
    icon: "save",
    title: "My Formations",
    description: "Open, share, and manage your saved rotation formations.",
    href: "/tools/volleyball-rotations/my-formations",
  },
  {
    icon: "quick",
    title: "Quick Match",
    description: "Score a one-off match between any two teams.",
    href: "/quick-match",
  },
  {
    icon: "bracket",
    title: "New Competition",
    description: "Set up a bracket, round robin, or rotation league.",
    href: "/competitions/new",
  },
];

/**
 * One destination in the launcher: a ruled row below `sm`, the shipped poster
 * card from `sm` up.
 *
 * Every card-only declaration is behind `sm:`, so the tablet and desktop
 * renders are byte-for-byte the composition that shipped and only the phone
 * changes. The two forms share one element rather than being two subtrees
 * behind `sm:hidden` / `hidden sm:grid`, because a duplicated map is two lists
 * that can drift and one destination that is announced twice to a screen
 * reader.
 *
 * `.mb-row-hover` replaces the hand-written `transition-colors
 * hover:bg-[var(--mb-tint-1)] active:bg-[var(--mb-tint-press)]` triplet: it is
 * the same three declarations under the app's own name, and it is what every
 * other tappable row in this file already uses.
 */
const ToolLink = ({ tool }: { tool: (typeof TOOLS)[number] }) => (
  <Link
    href={tool.href}
    className="group mb-btn-touch mb-row-hover flex items-start gap-3 px-4 py-3 sm:flex-col sm:gap-2 sm:border sm:border-mb-navy sm:bg-mb-paper-bright sm:p-4"
  >
    {/* The named 999px, not `rounded-full`'s `calc(infinity * 1px)`. 36px in
        the row and the shipped 44px in the card — a row's glyph is a mark
        beside a title, not the card's own lockup. */}
    <span className="mb-icon-disc h-9 w-9 sm:h-11 sm:w-11">
      <MbIcon id={tool.icon} size={20} />
    </span>
    <span className="flex min-w-0 flex-col gap-0.5 sm:flex-1 sm:gap-2">
      {/* 0.05em, not 0.06em. This is 0.95rem/700 — the same pair as every
          `<Panel>` title on the screen, which declares `display/panel-title`'s
          0.05em. Two trackings on one size/weight pair is rubric 1.3, and
          0.01em bought nothing that a reader could see. */}
      <span className="matchbook-display text-[0.95rem] mb-track-title font-bold">
        {tool.title}
      </span>
      {/* `body/xs`. 0.76rem sat between 0.72 and 0.78. */}
      <span className="text-[0.78rem] leading-snug text-mb-ink-muted">
        {tool.description}
      </span>
      {/* The card IS the link, so this is a mark, not a second control — it
          takes the card's own hover underline rather than a hue.
          `group-hover:text-mb-coral` was a coral letterform at 11.52px on a
          transient state.

          Card-only. In a row it is a third line restating the row's single job
          in a viewport where nothing hovers at all: 22px x 4 of a chevron
          saying what tapping the row already says. The row keeps the chevron
          the rest of the app gives a list row — none — and the whole row is
          the target. */}
      {/* `sm:flex` and not `sm:block`. `.mb-panel-link` is an `inline-flex`,
          and inside a block wrapper it acquires a LINE BOX — measured, that
          alone put 6px back on every card and grew the desktop content from
          722px to 728px against a shipped render this change is supposed to
          leave alone. As a flex item it has no line box and the card is the
          shipped height to the pixel. The wrapper exists at all because
          `hidden` and `.mb-panel-link`'s own `display` are both one class deep,
          so hiding the link itself would be a cascade-order coin toss. */}
      <span className="mt-auto hidden pt-1 sm:flex">
        <span className="mb-panel-link group-hover:underline">
          Open Tool
          <MbIcon id="chevron-right" size={11} />
        </span>
      </span>
    </span>
  </Link>
);

export default function ToolsPage() {
  const { user, isGuest, isLoading } = useAuth();
  const [formations, setFormations] = useState<UserFormation[]>([]);
  const [formationsState, setFormationsState] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserFormations(user.uid)
      .then((result) => {
        if (!cancelled) {
          setFormations(result);
          setFormationsState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setFormationsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (isLoading) return <MbPageLoading active="/tools" />;

  return (
    <MatchbookShell
      active="/tools"
      /* The rail key is this screen's primary action, so it keeps the coral and
         the masthead carries none — one coral fill, in the one place a reader
         looks for the app's next step. */
      cta={{ href: "/tools/volleyball-rotations", label: "Open Designer", icon: "court" }}
      masthead={{
        title: (
          <>
            Tournament <span className="text-mb-coral">Toolkit</span>
          </>
        ),
        shortTitle: "Tools",
        badge: { value: TOOLS.length, label: "Tools" },
      }}
    >
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Tool launcher */}
        <div className="xl:col-span-12">
          <Panel title="Toolkit">
            {/* A ruled list below `sm`, the shipped card grid from `sm` up.
                `divide-y` is the list's own rules and `sm:divide-y-0` hands the
                separation back to the grid's 16px gutters and the cards' own
                borders — two ways of dividing four items, one active at a
                time. The rows sit flush to the panel edges (no `p-4`), which is
                what makes them rows rather than cards without a border. */}
            <div className="flex flex-col divide-y divide-mb-rule sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0 sm:p-4 xl:grid-cols-4">
              {TOOLS.map((tool) => (
                <ToolLink key={tool.title} tool={tool} />
              ))}
            </div>
          </Panel>
        </div>

        {/* Saved formations */}
        <div className="xl:col-span-7">
          <Panel
            title="Saved Formations"
            meta={
              <MbPanelHeadLink
                href="/tools/volleyball-rotations/my-formations"
                label="Manage All"
              />
            }
          >
            {isGuest ? (
              <PanelEmpty
                message="No formations exist yet — sign in to save and share your rotation layouts."
                actionLabel="Sign in"
                href="/login?redirect=/tools"
              />
            ) : formationsState === "loading" ? (
              <p className="p-4 text-center text-[0.8rem] text-mb-ink-muted">
                Loading saved formations…
              </p>
            ) : formationsState === "error" ? (
              <PanelEmpty message="Saved formations could not be loaded right now — try again from My Formations." />
            ) : formations.length === 0 ? (
              <PanelEmpty
                message="No formations exist yet — save a layout from the rotation designer to see it here."
                actionLabel="Open designer"
                href="/tools/volleyball-rotations"
              />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {formations.slice(0, 6).map((formation) => (
                  <Link
                    key={formation.id}
                    href="/tools/volleyball-rotations/my-formations"
                    className="mb-btn-touch mb-row-hover grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 px-4 py-2"
                  >
                    <MbIcon id="clipboard" size={15} className="text-mb-navy" />
                    <span className="min-w-0">
                      <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
                        {formation.name}
                      </span>
                      {formation.description && (
                        <span className="block truncate text-[0.66rem] text-mb-ink-muted">
                          {formation.description}
                        </span>
                      )}
                    </span>
                    {/* Teal at 9.6px/700 measured 3.80:1 against a 4.5:1 floor.
                        `MbBadge` inks the word navy and puts the teal on a
                        mark, where 3:1 applies. */}
                    {formation.shareId && <MbBadge tone="teal">Shared</MbBadge>}
                    <span className="mb-kicker tabular-nums">
                      {formatDate(formation.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Court reference */}
        <div className="xl:col-span-5">
          <Panel title="Court Reference" tone="navy" icon="court">
            <div className="flex flex-1 flex-col items-center gap-3 p-5">
              <Image
                src="/assets/matchbook/diagrams/volleyball-court.svg"
                alt="Top-down volleyball court diagram with position zones"
                width={340}
                height={220}
                className="h-auto w-full max-w-[360px]"
              />
              <p className="text-center text-[0.74rem] leading-snug text-mb-ink-muted">
                Standard indoor court with rotation zones 1–6. Open the rotation
                designer to place players and validate overlap rules against it.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </MatchbookShell>
  );
}
