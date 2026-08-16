"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import { MbConfirm } from "@/components/matchbook/Confirm";
import { MbNotice } from "@/components/matchbook/Notice";
import { Panel } from "@/components/matchbook/Panel";
import {
  useMatchbookDesigner,
  type MbFormationCategory,
} from "@/components/matchbook/useMatchbookRotations";
import {
  CourtStage,
  DiagramGuide,
  FormationPicker,
  OnCourtPanel,
  RotationFacts,
  RotationLayers,
  RotationRail,
  ShareFormationDialog,
} from "@/components/volleyball";
import type { UserFormation } from "@/lib/volleyball/types";

/* ===========================================================================
   ROTATION DESIGNER

   Was: `<div className="min-h-screen bg-background"><Navigation />`, a centred
   `text-4xl font-black uppercase` headline, four `rounded-2xl shadow-soft`
   cards, twenty-five sub-44px targets, five Heroicons, a `window.confirm` for
   delete, and a mobile order that put the court 243px tall above 700px of
   formation picker and 500px of help text with the legend — the thing the
   court cross-highlights — at y = 2096.

   The order here IS the mobile order, because a `xl:grid-cols-12` collapses to
   DOM order at every width below `xl`:

     1  masthead, carrying the live rotation in its badge
     2  the court panel — control rail, then the diagram
     3  On Court — the legend, now one scroll from the thing it highlights
     4  Formation
     5  Reading the Diagram — reference prose, last

   Delete goes through `MbConfirm`. `window.confirm` blocks the main thread,
   cannot be styled, cannot be reached by the screenshot harness, and on iOS
   renders the origin above the question.

   THE SHORT-VIEWPORT CUT (`SHORT` below) is the answer to a measured failure:
   at 844x390 — a phone turned sideways, which is exactly how somebody props a
   device on a bench — the masthead ran to y 191, the control rail to y 399, and
   the court began 9px BELOW the fold. Not "clipped": absent. Under 560px of
   height the panel body becomes two columns and the rail, the layer chips and
   the facts move BESIDE the diagram instead of above it, which buys back the
   148px the rail was spending; the court is then sized from the height that is
   left rather than from the width that is available, so the whole diagram lands
   above the fold instead of a slice of it. Above 560px nothing changes — the
   grid placement and the width cap are both inside the query.
   =========================================================================== */

/**
 * Grid placement for the short-viewport cut. Written once so the four children
 * cannot drift into four different queries, and applied through explicit
 * `col-start`/`row-start` so the DOM order — rail, court, layers, facts — stays
 * the reading order at every other size.
 */
const SHORT = {
  body:
    "[@media(max-height:560px)]:grid [@media(max-height:560px)]:grid-cols-[auto_minmax(0,1fr)] " +
    "[@media(max-height:560px)]:items-start",
  court:
    "[@media(max-height:560px)]:col-start-1 [@media(max-height:560px)]:row-start-1 " +
    "[@media(max-height:560px)]:row-span-3 [@media(max-height:560px)]:border-r " +
    "[@media(max-height:560px)]:border-mb-rule",
  rail: "[@media(max-height:560px)]:col-start-2 [@media(max-height:560px)]:row-start-1",
  layers: "[@media(max-height:560px)]:col-start-2 [@media(max-height:560px)]:row-start-2",
  facts: "[@media(max-height:560px)]:col-start-2 [@media(max-height:560px)]:row-start-3",
  /* 1.21 is COURT_ASPECT (464/382): the court is sized from the height left
     under the masthead and the panel head, not from the column it sits in.
     356px is a HARD floor and it is the reason the whole court cannot fit at
     390px of viewport height: the six 52px token targets are 61px apart at a
     356px court and 55px apart at a 320px one, so anything narrower puts two
     adjacent players' hit circles under the 8px separation floor — a mis-tap
     on the screen's primary object, which is worse than a scroll. */
  courtSize:
    "[@media(max-height:560px)]:w-[calc((100dvh-16.5rem)*1.21)] " +
    "[@media(max-height:560px)]:min-w-[356px] [@media(max-height:560px)]:max-w-full",
} as const;

export default function VolleyballRotationsPage() {
  const router = useRouter();
  const designer = useMatchbookDesigner();
  const [category, setCategory] = useState<MbFormationCategory>("builtin");
  const [sharing, setSharing] = useState<UserFormation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserFormation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    formations,
    rotation,
    mode,
    liberoActive,
    players,
    arrows,
    overlaps,
    setRotation,
    setMode,
    setLiberoActive,
    nextRotation,
    prevRotation,
    selected,
    selectedId,
    selectFormation,
    selectedPlayer,
    setSelectedPlayer,
    showOverlaps,
    setShowOverlaps,
    showArrows,
    setShowArrows,
    setterRow,
    frontRowAttackers,
  } = designer;

  const signedIn = formations.isAuthenticated;

  const editorHref = useMemo(() => {
    if (selected.category === "custom") {
      return `/tools/volleyball-rotations/editor?id=${encodeURIComponent(selected.id)}`;
    }
    if (selected.category === "starter") {
      return `/tools/volleyball-rotations/editor?template=${encodeURIComponent(selected.id)}`;
    }
    return "/tools/volleyball-rotations/editor";
  }, [selected]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await formations.remove(pendingDelete.id);
      if (selectedId === pendingDelete.id) selectFormation("traditional");
      setPendingDelete(null);
    } catch {
      setActionError(
        `“${pendingDelete.name}” could not be deleted. Check your connection and try again.`
      );
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, formations, selectedId, selectFormation]);

  const byId = useCallback(
    (id: string) => formations.formations.find((formation) => formation.id === id) ?? null,
    [formations.formations]
  );

  const duplicate = useCallback(
    async (id: string) => {
      const source = byId(id);
      if (!source) return;
      setActionError(null);
      try {
        const copy = await formations.duplicate(source);
        selectFormation(copy.id);
      } catch {
        setActionError("The formation could not be duplicated. Check your connection and try again.");
      }
    },
    [byId, formations, selectFormation]
  );

  return (
    <MatchbookShell
      active="/tools"
      /* The app's own primary action, as on `/teams` and `/summaries`. It used
         to be "My Formations", which is also the masthead's second action — the
         same destination named twice on one desktop screen, and the rail key is
         gone below `lg` so the duplication bought nothing on a phone either. */
      cta={MB_DEFAULT_CTA}
      masthead={{
        title: (
          <>
            Rotation <span className="text-mb-coral">Designer</span>
          </>
        ),
        shortTitle: "Rotations",
        badge: { value: `R${rotation}`, label: "Rotation" },
        dateLine: "5-1 System",
        subLine: "6 Rotations · FIVB 7.4",
        actions: [
          signedIn
            ? {
                label: selected.category === "custom" ? "Edit Formation" : "Open Editor",
                icon: "edit",
                variant: "coral",
                href: editorHref,
              }
            : {
                label: "Sign In To Save",
                icon: "login",
                variant: "coral",
                href: "/login?redirect=/tools/volleyball-rotations",
              },
          {
            label: "My Formations",
            icon: "save",
            variant: "navy",
            href: "/tools/volleyball-rotations/my-formations",
          },
        ],
      }}
    >
      {actionError && (
        <div className="mb-4">
          <MbNotice tone="danger" title="Action failed">
            {actionError}
          </MbNotice>
        </div>
      )}

      {/* The two right-hand panels carry `xl:self-start`, so they are the
          height of their own contents instead of being stretched to the row.
          Before it, the On Court panel ran ~380px of empty cream under its
          legend at 1440 and the guide panel ran ~200px under its last closed
          section — voids that were leftover rather than shaped (rubric 2.x).
          `sticky` still works on a `self-start` grid item: it travels inside
          its grid AREA, which is still the full row height. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title={`Rotation ${rotation} · ${mode === "serving" ? "Serving" : "Receiving"}`}
            /* Wrapped, not truncated, and no `title` attribute: the formation
               name is the answer to "which of these am I looking at", and a
               truncated answer with the rest in a tooltip is unreachable on a
               touch screen (hard fail 12). */
            meta={
              <span className="mb-kicker max-w-[22ch] text-right leading-tight break-words">
                {selected.name}
              </span>
            }
          >
            <div className={SHORT.body}>
              <div className={SHORT.rail}>
                <RotationRail
                  rotation={rotation}
                  mode={mode}
                  onRotationChange={setRotation}
                  onModeChange={setMode}
                  onNext={nextRotation}
                  onPrev={prevRotation}
                />
              </div>
              {/* The court is full-bleed to the panel edge. On a 390px screen
                  that is the difference between a 243px diagram and a 287px
                  one, and it is the whole reason the panel body carries no
                  padding here. */}
              <div className={`flex justify-center ${SHORT.court}`}>
                <CourtStage
                  className={SHORT.courtSize}
                  players={players}
                  overlaps={overlaps}
                  arrows={arrows}
                  mode={mode}
                  rotation={rotation}
                  selectedPlayer={selectedPlayer}
                  onPlayerSelect={setSelectedPlayer}
                  showOverlaps={showOverlaps}
                  showArrows={showArrows}
                />
              </div>
              <div className={SHORT.layers}>
                <RotationLayers
                  liberoActive={liberoActive}
                  onLiberoToggle={setLiberoActive}
                  showOverlaps={showOverlaps}
                  showArrows={showArrows}
                  onShowOverlapsChange={setShowOverlaps}
                  onShowArrowsChange={setShowArrows}
                />
              </div>
              <div className={SHORT.facts}>
                <RotationFacts
                  setterRow={setterRow}
                  frontRowAttackers={frontRowAttackers}
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-5 xl:self-start">
          <Panel
            title="On Court"
            className="xl:sticky xl:top-5"
            meta={<span className="mb-kicker tabular-nums">{players.length} Players</span>}
          >
            <OnCourtPanel
              players={players}
              selectedPlayer={selectedPlayer}
              onPlayerSelect={setSelectedPlayer}
            />
          </Panel>
        </div>

        <div className="xl:col-span-7">
          <Panel title="Formation">
            <FormationPicker
              category={category}
              onCategoryChange={setCategory}
              builtins={designer.builtins}
              starters={designer.starters}
              custom={designer.custom}
              selectedId={selectedId}
              selected={selected}
              onSelect={selectFormation}
              isAuthenticated={signedIn}
              status={formations.status}
              onRetry={() => void formations.refresh()}
              onCreate={() => router.push("/tools/volleyball-rotations/editor")}
              onEdit={(id) =>
                router.push(`/tools/volleyball-rotations/editor?id=${encodeURIComponent(id)}`)
              }
              onDuplicate={(id) => void duplicate(id)}
              onShare={(id) => setSharing(byId(id))}
              onDelete={(id) => setPendingDelete(byId(id))}
            />
          </Panel>
        </div>

        <div className="xl:col-span-5 xl:self-start">
          <Panel title="Reading The Diagram" icon="help">
            <DiagramGuide />
          </Panel>
        </div>
      </div>

      <ShareFormationDialog
        open={Boolean(sharing)}
        onOpenChange={(open) => !open && setSharing(null)}
        formation={sharing}
        onEnableSharing={formations.share}
        onDisableSharing={formations.unshare}
      />

      <MbConfirm
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete formation"
        verb="Delete"
        subject={pendingDelete?.name}
        body="The formation and any share link it has are removed. This cannot be undone."
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </MatchbookShell>
  );
}
