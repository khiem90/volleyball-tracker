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

/* TOOLKIT. The launcher renders as ruled rows below `sm` and as the poster
   card grid from `sm` up — one markup, two forms, every card-only class
   behind `sm:`. */

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
 * One destination in the launcher: a ruled row below `sm`, a poster card from
 * `sm` up. One element, not two subtrees behind `sm:hidden` — a duplicated
 * map is two lists that can drift, and one destination announced twice to a
 * screen reader.
 */
const ToolLink = ({ tool }: { tool: (typeof TOOLS)[number] }) => (
  <Link
    href={tool.href}
    className="group mb-btn-touch mb-row-hover flex items-start gap-3 px-4 py-3 sm:flex-col sm:gap-2 sm:border sm:border-mb-navy sm:bg-mb-paper-bright sm:p-4"
  >
    {/* 36px in the row, 44px in the card — a row's glyph is a mark beside a
        title, not the card's lockup. */}
    <span className="mb-icon-disc h-9 w-9 sm:h-11 sm:w-11">
      <MbIcon id={tool.icon} size={20} />
    </span>
    <span className="flex min-w-0 flex-col gap-[3px] sm:flex-1 sm:gap-2">
      <span className="matchbook-display text-[0.95rem] mb-track-title font-bold">
        {tool.title}
      </span>
      <span className="text-[0.78rem] leading-snug text-mb-ink-muted">
        {tool.description}
      </span>
      {/* "Open Tool" is a mark, not a second control — the card is the link.
          Card-only: a row's whole surface is the target. The wrapper must be
          `sm:flex`, not `sm:block` (a block wrapper gives the inline-flex link
          a line box and grows the card), and the wrapper exists because hiding
          `.mb-panel-link` directly would be a cascade-order coin toss against
          `hidden`. */}
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
            {/* Ruled list below `sm`, card grid from `sm` up — `divide-y` for
                the list, gutters and borders for the grid, one active at a
                time. */}
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
              <p className="p-4 text-center text-[0.85rem] text-mb-ink-muted">
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
                    {/* `MbBadge` inks the word navy and keeps the teal on a
                        mark — teal letterforms fail contrast at this size. */}
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
              <p className="text-center text-[0.72rem] leading-snug text-mb-ink-muted">
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
