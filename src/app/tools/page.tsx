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
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {TOOLS.map((tool) => (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="group flex flex-col gap-2 border border-mb-navy bg-mb-paper-bright p-4 transition-colors hover:bg-[var(--mb-tint-1)] active:bg-[var(--mb-tint-press)]"
                >
                  {/* The named 999px, not `rounded-full`'s
                      `calc(infinity * 1px)`. */}
                  <span className="mb-icon-disc h-11 w-11">
                    <MbIcon id={tool.icon} size={20} />
                  </span>
                  {/* 0.05em, not 0.06em. This is 0.95rem/700 — the same pair as
                      every `<Panel>` title on the screen, which declares
                      `display/panel-title`'s 0.05em. Two trackings on one
                      size/weight pair is rubric 1.3, and 0.01em bought nothing
                      that a reader could see. */}
                  <span className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em]">
                    {tool.title}
                  </span>
                  {/* `body/xs`. 0.76rem sat between 0.72 and 0.78. */}
                  <span className="text-[0.78rem] leading-snug text-mb-ink-muted">
                    {tool.description}
                  </span>
                  {/* The card IS the link, so this is a mark, not a second
                      control — it takes the card's own hover underline rather
                      than a hue. `group-hover:text-mb-coral` was a coral
                      letterform at 11.52px on a transient state. */}
                  <span className="mb-panel-link mt-auto pt-1 group-hover:underline">
                    Open Tool
                    <MbIcon id="chevron-right" size={11} />
                  </span>
                </Link>
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
                      <span className="matchbook-display block truncate text-[0.78rem] font-bold">
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
