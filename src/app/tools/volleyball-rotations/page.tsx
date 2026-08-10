"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MatchbookShell } from "@/components/matchbook/AppShell";
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
   =========================================================================== */

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
      /* The rail key is deliberately NOT coral here. Invariant 15 allows one
         coral per screen for the primary job, and on this screen that job is
         the masthead's Open Editor — the only control that exists at every
         width, because the rail is gone below `lg`. A coral rail key beside a
         coral masthead action would put two coral fills on one desktop screen
         and none on a phone. */
      cta={{
        href: "/tools/volleyball-rotations/my-formations",
        label: "My Formations",
        icon: "save",
        tone: "outline-navy",
      }}
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
                tone: "coral",
                href: editorHref,
              }
            : {
                label: "Sign In To Save",
                icon: "login",
                tone: "coral",
                href: "/login?redirect=/tools/volleyball-rotations",
              },
          {
            label: "My Formations",
            icon: "save",
            tone: "navy",
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

      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title={`Rotation ${rotation} · ${mode === "serving" ? "Serving" : "Receiving"}`}
            meta={
              <span className="mb-kicker truncate" title={selected.name}>
                {selected.name}
              </span>
            }
          >
            <RotationRail
              rotation={rotation}
              mode={mode}
              onRotationChange={setRotation}
              onModeChange={setMode}
              onNext={nextRotation}
              onPrev={prevRotation}
            />
            {/* The court is full-bleed to the panel edge. On a 390px screen that
                is the difference between a 243px diagram and a 287px one, and
                it is the whole reason the panel body carries no padding here. */}
            <CourtStage
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
            <RotationLayers
              liberoActive={liberoActive}
              onLiberoToggle={setLiberoActive}
              showOverlaps={showOverlaps}
              showArrows={showArrows}
              onShowOverlapsChange={setShowOverlaps}
              onShowArrowsChange={setShowArrows}
            />
            <RotationFacts
              setterRow={setterRow}
              frontRowAttackers={frontRowAttackers}
            />
          </Panel>
        </div>

        <div className="xl:col-span-5">
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

        <div className="xl:col-span-5">
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
