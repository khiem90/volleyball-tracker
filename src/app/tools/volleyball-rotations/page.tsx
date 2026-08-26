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

/* ROTATION DESIGNER. DOM order is the mobile order (a `xl:grid-cols-12`
   collapses to DOM order below `xl`): court panel, On Court legend,
   Formation, then reference prose. Delete goes through `MbConfirm` —
   `window.confirm` blocks the main thread and cannot be styled.

   THE SHORT-VIEWPORT CUT (`SHORT` below): under 560px of viewport height the
   panel body becomes two columns — rail, layer chips and facts move beside
   the diagram — and the court is sized from the height that is left, so the
   whole diagram lands above the fold on a sideways phone. Above 560px nothing
   changes; every declaration is inside the query. */

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
  /* 1.21 is COURT_ASPECT (464/382). 356px is a HARD width floor: any
     narrower and two adjacent players' hit circles fall under the 8px
     separation minimum — a mis-tap is worse than a scroll. */
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
      /* The app's default CTA — "My Formations" here would name the masthead's
         second action twice on one screen. */
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

      {/* The right-hand panels carry `xl:self-start` so they take their own
          height instead of stretching into voids. `sticky` still works on a
          `self-start` grid item — it travels inside its grid area, which is
          still the full row height. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title={`Rotation ${rotation} · ${mode === "serving" ? "Serving" : "Receiving"}`}
            /* Wrapped, not truncated, and no `title` attribute — a tooltip is
               unreachable on a touch screen. */
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
              {/* The court is full-bleed to the panel edge — the reason the
                  panel body carries no padding here. */}
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
