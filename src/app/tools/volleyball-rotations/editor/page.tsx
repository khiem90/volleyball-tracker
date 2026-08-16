"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbActionBar } from "@/components/matchbook/ActionBar";
import { MbConfirm } from "@/components/matchbook/Confirm";
import { MbEmptyState } from "@/components/matchbook/EmptyState";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { Panel } from "@/components/matchbook/Panel";
import {
  EditorCourtStage,
  RotationFacts,
  RotationLayers,
  RotationRail,
} from "@/components/volleyball";
import {
  ArrowsPanel,
  DetailsPanel,
  FrameActions,
  ValidationPanel,
} from "@/components/volleyball/editor/panels";
import { useFormationEditor } from "@/hooks/useFormationEditor";
import { useUserFormations } from "@/hooks/useUserFormations";
import { BACK_ROW_ZONES } from "@/lib/volleyball/constants";
import {
  getFrontRowAttackerCount,
  getRoleZone,
  isSetterFrontRow,
} from "@/lib/volleyball/rotations";
import type {
  CourtPosition,
  PlayerRole,
  UserFormation,
} from "@/lib/volleyball/types";

/* ===========================================================================
   THE FORMATION EDITOR — NOW A ROUTE

   It was a modal, and on a phone it did not work at all: the court's bounding
   box sat at y = 1060 inside an `overflow-hidden` shell capped at
   `max-h-[90vh]`, in a column whose `scrollHeight === clientHeight`, so it
   could not be scrolled to. Measured at 390x844: the court was unreachable and
   no player could be positioned from a phone. Even at 1440x900 the Description,
   Tags and Visibility fields sat below the visible area with no affordance.

   As a route (charter W7 decision) the browser's own scroller is the scroller,
   deep links work (`?id=` to edit, `?from=` to duplicate, `?template=` to start
   from a starter), Back means Back, and drafts survive a full navigation.

   `variant="focus"` rather than `console`: an editor with unsaved state is a
   workspace, and the shell's fixed bottom bar is exactly where the Save action
   belongs. One fixed bar, not two.

   Mobile layout is the same DOM in one column — court first, tools under it,
   Save in the bar. Every metadata field is reachable by ordinary page scroll.
   =========================================================================== */

const backRowForRotation = (rotation: number) => (role: PlayerRole) => {
  const zone = getRoleZone(rotation as 1 | 2 | 3 | 4 | 5 | 6, role === "L" ? "MB1" : role);
  return BACK_ROW_ZONES.includes(zone);
};

const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/* ------------------------------------------------------------- the workspace */

interface WorkspaceProps {
  mode: "create" | "edit" | "duplicate";
  existing?: UserFormation;
  templateId?: string;
}

const EditorWorkspace = ({ mode, existing, templateId }: WorkspaceProps) => {
  const router = useRouter();
  const formations = useUserFormations();
  const editor = useFormationEditor({ mode, existingFormation: existing, templateId });

  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [arrowStartRole, setArrowStartRole] = useState<PlayerRole | null>(null);
  const [live, setLive] = useState<CourtPosition | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState(
    () => mode === "create" && editor.hasDraft
  );

  const { hasUnsavedChanges } = editor;

  /* The unsaved-changes guard. App Router gives no client-side navigation
     interception, so this covers reload, tab close and external navigation;
     in-app exits are routed through `leaveTo` and `MbConfirm` below. */
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  const backRow = useMemo(
    () => backRowForRotation(editor.currentRotation),
    [editor.currentRotation]
  );

  const arrowRoles = useMemo(
    () =>
      Object.keys(editor.currentFrame?.movementArrows ?? {}).filter(
        (role) => editor.currentFrame?.movementArrows?.[role as PlayerRole]
      ) as PlayerRole[],
    [editor.currentFrame]
  );

  const handleArrowEnd = useCallback(
    (position: CourtPosition) => {
      if (!arrowStartRole || !editor.currentFrame) return;
      const source =
        arrowStartRole === "L"
          ? editor.currentFrame.roleSpots.L ?? editor.currentFrame.roleSpots.MB1
          : editor.currentFrame.roleSpots[arrowStartRole];
      if (source) editor.updateMovementArrow(arrowStartRole, source, position);
      setArrowStartRole(null);
    },
    [arrowStartRole, editor]
  );

  const nameError =
    saveError === "name" ? "A formation needs a name before it can be saved." : undefined;

  const save = useCallback(async () => {
    const payload = editor.getFormationForSave();
    if (!payload.name) {
      setSaveError("name");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (mode === "edit" && existing) {
        await formations.update(existing.id, {
          name: payload.name,
          description: payload.description,
          tags: payload.tags,
          visibility: payload.visibility,
          data: payload.data,
        });
      } else {
        await formations.create(payload.name, payload.data, {
          description: payload.description,
          tags: payload.tags,
          visibility: payload.visibility,
          baseSource: existing
            ? { type: "custom", id: existing.id }
            : templateId
            ? { type: "template", id: templateId }
            : undefined,
        });
      }
      editor.clearDraft();
      router.push("/tools/volleyball-rotations/my-formations");
    } catch {
      setSaveError("write");
      setSaving(false);
    }
  }, [editor, mode, existing, templateId, formations, router]);

  const exitHref =
    mode === "create" ? "/tools/volleyball-rotations" : "/tools/volleyball-rotations/my-formations";

  const leave = useCallback(
    (href: string) => {
      if (hasUnsavedChanges) setLeaveTo(href);
      else router.push(href);
    },
    [hasUnsavedChanges, router]
  );

  const title = mode === "edit" ? existing?.name ?? "Formation" : "New Formation";

  return (
    <MatchbookShell
      variant="focus"
      active="/tools"
      back={{ onClick: () => leave(exitHref), label: "Close editor" }}
      masthead={{ title, shortTitle: title }}
    >
      <div className="px-4 py-5 pb-[calc(112px_+_var(--mb-safe-bottom))] sm:px-6 lg:px-8 xl:pb-5">
        {draftPrompt && (
          <div className="mb-4">
            <MbNotice tone="info" icon="undo" title="An unsaved draft was found">
              <span className="flex flex-wrap items-center gap-3">
                <span>
                  A formation you were working on was saved locally and never
                  committed.
                </span>
                <button
                  type="button"
                  className="mb-panel-link underline"
                  onClick={() => {
                    editor.loadDraft();
                    setDraftPrompt(false);
                  }}
                >
                  Load draft
                </button>
                <button
                  type="button"
                  className="mb-panel-link underline"
                  onClick={() => {
                    editor.clearDraft();
                    setDraftPrompt(false);
                  }}
                >
                  Start fresh
                </button>
              </span>
            </MbNotice>
          </div>
        )}

        {saveError === "write" && (
          <div className="mb-4">
            <MbNotice tone="danger" title="The formation was not saved">
              The write to the formation store failed. Your work is still on
              screen and in the local draft — check your connection and press
              Save again.
            </MbNotice>
          </div>
        )}

        <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* `self-start`: the tool rail is four panels tall and the court is
              one, and a stretched court panel left ~600px of blank paper under
              the diagram at 1440. The court sizes itself; the rail runs long. */}
          <div className="xl:col-span-7 xl:self-start">
            <Panel
              title={`Rotation ${editor.currentRotation} · ${
                editor.currentMode === "serving" ? "Serving" : "Receiving"
              }`}
              meta={
                /* The live readout, in a FIXED-WIDTH tabular box. It used to be
                   SVG text under the dragged token in proportional figures,
                   re-typesetting every frame. Here nothing can reflow: the box
                   is 11 characters wide whether it holds a value or a dash. */
                <span
                  className="mb-kicker inline-block text-right tabular-nums"
                  style={{ width: "11ch" }}
                  aria-live="off"
                >
                  {live ? `${live.x.toFixed(2)}, ${live.y.toFixed(2)}` : "— , —"}
                </span>
              }
            >
              <RotationRail
                rotation={editor.currentRotation}
                mode={editor.currentMode}
                onRotationChange={editor.setCurrentRotation}
                onModeChange={editor.setCurrentMode}
                onNext={editor.nextRotation}
                onPrev={editor.prevRotation}
              />
              {editor.currentFrame ? (
                <EditorCourtStage
                  frame={editor.currentFrame}
                  rotation={editor.currentRotation}
                  mode={editor.currentMode}
                  liberoActive={editor.liberoActive}
                  selectedRole={editor.selectedRole}
                  onSelectRole={editor.setSelectedRole}
                  onPositionChange={editor.updatePlayerPosition}
                  onDragStart={() => editor.setIsDragging(true)}
                  onDragEnd={() => editor.setIsDragging(false)}
                  onDragPosition={setLive}
                  isDrawingArrow={isDrawingArrow}
                  arrowStartRole={arrowStartRole}
                  onArrowStartSelect={setArrowStartRole}
                  onArrowEndSelect={handleArrowEnd}
                  onArrowCancel={() => {
                    setArrowStartRole(null);
                    setIsDrawingArrow(false);
                  }}
                  showOverlaps={showOverlaps}
                  showArrows={showArrows}
                />
              ) : (
                <div className="p-4">
                  <MbNotice tone="danger" title="This frame is missing">
                    Rotation {editor.currentRotation} has no {editor.currentMode}{" "}
                    frame. Use Reset Rotation to rebuild it from the starter.
                  </MbNotice>
                </div>
              )}
              <RotationLayers
                liberoActive={editor.liberoActive}
                onLiberoToggle={editor.setLiberoActive}
                showOverlaps={showOverlaps}
                showArrows={showArrows}
                onShowOverlapsChange={setShowOverlaps}
                onShowArrowsChange={setShowArrows}
              />
              <RotationFacts
                setterRow={isSetterFrontRow(editor.currentRotation) ? "Front" : "Back"}
                frontRowAttackers={getFrontRowAttackerCount(editor.currentRotation)}
              />
            </Panel>
          </div>

          {/* The tool rail is sticky and scrolls in its own right from `xl` up
              (brief §3.5). Two reasons, and the second is a measurement:

              the court is the fixed reference and the rail is a stack of four
              tool panels taller than any laptop, so scrolling the page to reach
              Validation used to scroll the court away from the thing being
              validated;

              and a rail that ends at the viewport is a rail whose last control
              cannot come to rest a few pixels above the sticky commit bar. At
              1440x900 the Name field settled 6.4px above Save and Close — two
              targets a mis-tap apart, which is exactly what the separation
              floor is for. Below `xl` there is no inner scroller at all: the
              document is the scroller and the panels simply stack. */}
          <div className="flex flex-col gap-4 xl:col-span-5 xl:sticky xl:top-5 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-1">
            <Panel title="Arrows" icon="arrow-move">
              <ArrowsPanel
                arrows={arrowRoles}
                isDrawing={isDrawingArrow}
                arrowStartRole={arrowStartRole}
                onStartDrawing={() => setIsDrawingArrow(true)}
                onStopDrawing={() => {
                  setIsDrawingArrow(false);
                  setArrowStartRole(null);
                }}
                onCancel={() => {
                  setIsDrawingArrow(false);
                  setArrowStartRole(null);
                }}
                onRemove={editor.removeMovementArrow}
                backRow={backRow}
              />
            </Panel>

            <Panel title="Frame Actions">
              <FrameActions
                onCopy={editor.copyCurrentFrame}
                onPaste={editor.pasteFrame}
                onReset={editor.resetCurrentRotation}
                onApplyAll={editor.applyCurrentFrameToAllRotations}
                hasCopiedFrame={editor.hasCopiedFrame}
              />
            </Panel>

            <Panel title="Details">
              <DetailsPanel
                name={editor.metadata.name}
                description={editor.metadata.description}
                tags={editor.metadata.tags}
                visibility={editor.metadata.visibility}
                onNameChange={editor.setName}
                onDescriptionChange={editor.setDescription}
                onTagsChange={editor.setTags}
                onVisibilityChange={editor.setVisibility}
                nameError={nameError}
              />
            </Panel>

            <Panel title="Validation" icon="check">
              <ValidationPanel
                blockingErrors={editor.blockingErrors}
                overlapWarnings={editor.overlapWarnings}
              />
            </Panel>
          </div>
        </div>
      </div>

      {/* The commit bar FLOATS on a phone and SITS at the end of the workspace
          from `xl` up.

          Invariant 35 puts the primary action in the bottom third on mobile,
          and that is what the sticky wrapper does below `xl`. It does not say
          the bar must float on a 1440px desktop, and floating there has a
          measurable cost: a bar that overlays a scrolling page rests a few
          pixels from whatever the page happens to have at that height, and at
          1440x900 that was the Name field — measured 6.4px from Save and 6.4px
          from Close, two targets a mis-tap apart. On the wide layout the rail
          is a sticky column of its own, so the bar has a natural home under the
          workspace instead.

          `sticky={false}` is passed rather than fought: `.mb-action-bar` is
          unlayered and its `position: sticky` outranks a Tailwind `static`
          utility, so the component's own escape hatch is the only one that
          works, and the wrapper supplies the mobile behaviour on top. */}
      {/* `xl:mt-5`: once the bar is in flow it is a real neighbour of whatever
          the tool rail ends on, and the tag field landed 1.8px above Save. In
          flow the 8px separation floor genuinely applies, so it is paid. */}
      <div className="sticky bottom-0 z-30 xl:static xl:mt-5">
        <MbActionBar
          sticky={false}
          status={
            <span className="tabular-nums">
              {editor.hasUnsavedChanges ? "Unsaved changes" : "No changes"}
              {editor.draftSavedAt ? ` · draft saved ${formatClock(editor.draftSavedAt)}` : ""}
              {editor.blockingErrors.length > 0
                ? ` · ${editor.blockingErrors.length} blocking`
                : ""}
            </span>
          }
          secondary={{ label: "Close", variant: "outline-navy", onClick: () => leave(exitHref) }}
          primary={{
            label: mode === "edit" ? "Update Formation" : "Save Formation",
            icon: "save",
            variant: "coral",
            loading: saving,
            onClick: () => void save(),
          }}
        />
      </div>

      <MbConfirm
        open={Boolean(leaveTo)}
        onOpenChange={(open) => !open && setLeaveTo(null)}
        title="Leave the editor"
        verb="Discard"
        subject={editor.metadata.name || "this formation"}
        body="There are unsaved changes. A local draft is kept, so you can pick it up again from the editor."
        confirmLabel="Leave without saving"
        onConfirm={() => {
          editor.saveDraft();
          const href = leaveTo;
          setLeaveTo(null);
          if (href) router.push(href);
        }}
      />
    </MatchbookShell>
  );
};

/* ------------------------------------------------------------------- resolve */

const EditorRoute = () => {
  const params = useSearchParams();
  const formations = useUserFormations();

  const id = params.get("id");
  const from = params.get("from");
  const template = params.get("template") ?? undefined;
  const documentId = id ?? from;

  if (formations.isLoading && (documentId || !formations.isAuthenticated)) {
    return <MbPageLoading variant="focus" active="/tools" />;
  }

  if (!formations.isAuthenticated) {
    return (
      <MatchbookShell variant="focus" active="/tools" back={{ href: "/tools/volleyball-rotations", label: "Back" }}>
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <MbEmptyState
            tone="denied"
            title="Sign in to build a formation"
            body="Formations are saved to your account, so the editor needs you signed in. The rotation designer stays open to everyone."
            actions={[
              {
                label: "Sign in",
                href: "/login?redirect=/tools/volleyball-rotations/editor",
                variant: "coral",
              },
              { label: "Open the designer", href: "/tools/volleyball-rotations" },
            ]}
          />
        </div>
      </MatchbookShell>
    );
  }

  const existing = documentId ? formations.getById(documentId) : undefined;

  if (documentId && !existing) {
    return (
      <MatchbookShell
        variant="focus"
        active="/tools"
        back={{ href: "/tools/volleyball-rotations/my-formations", label: "Back" }}
      >
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <MbEmptyState
            tone={formations.isStale ? "offline" : "notfound"}
            title={
              formations.isStale
                ? "That formation is not available offline"
                : "That formation no longer exists"
            }
            body={
              formations.isStale
                ? "The formation store cannot be reached, so this document could not be read. Nothing has been lost."
                : "It may have been deleted, or the link may belong to another account."
            }
            actions={[
              { label: "Open the archive", href: "/tools/volleyball-rotations/my-formations", variant: "coral" },
              { label: "Start a new formation", href: "/tools/volleyball-rotations/editor" },
            ]}
          />
        </div>
      </MatchbookShell>
    );
  }

  return (
    <EditorWorkspace
      /* Keyed, so switching `?id=` remounts the working copy instead of
         editing document B with document A's twelve frames. */
      key={documentId ?? template ?? "new"}
      mode={id ? "edit" : from ? "duplicate" : "create"}
      existing={existing}
      templateId={template}
    />
  );
};

export default function FormationEditorPage() {
  return (
    <Suspense fallback={<MbPageLoading variant="focus" active="/tools" />}>
      <EditorRoute />
    </Suspense>
  );
}
