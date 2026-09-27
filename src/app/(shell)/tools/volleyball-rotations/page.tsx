"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import {
  VolleyballCourt,
  RotationControls,
  LegendPanel,
  HelpAccordion,
  FormationSelector,
  FormationEditorModal,
  ShareFormationDialog,
} from "@/components/volleyball";
import { useVolleyballRotation } from "@/hooks/useVolleyballRotation";
import { useUserFormations } from "@/hooks/useUserFormations";
import type { FormationType, UserFormation, FormationData, FormationVisibility } from "@/lib/volleyball/types";
import { signInHref } from "@/lib/shell";

export default function VolleyballRotationsPage() {
  const router = useRouter();
  const {
    formations: userFormations,
    isAuthenticated,
    create,
    update,
    remove,
    share,
    unshare,
    getById,
  } = useUserFormations();

  // Currently selected formation (can be builtin type or custom ID)
  const [selectedFormationId, setSelectedFormationId] = useState<FormationType | string>("traditional");

  // Get custom formation data if a custom formation is selected
  const selectedCustomFormation = useMemo(() => {
    if (["traditional", "stack", "spread", "rightSlant", "leftSlant"].includes(selectedFormationId)) {
      return null;
    }
    return getById(selectedFormationId);
  }, [selectedFormationId, getById]);

  const {
    rotation,
    mode,
    liberoActive,
    players,
    arrows,
    overlaps,
    setRotation,
    setMode,
    setFormation,
    setLiberoActive,
    nextRotation,
    prevRotation,
  } = useVolleyballRotation({
    customFormationData: selectedCustomFormation?.data || null,
  });

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showArrows, setShowArrows] = useState(true);

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "duplicate">("create");
  const [editingFormation, setEditingFormation] = useState<UserFormation | null>(null);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>();

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingFormation, setSharingFormation] = useState<UserFormation | null>(null);

  // Handle formation change (builtin or custom)
  const handleFormationChange = useCallback((f: FormationType | string) => {
    setSelectedFormationId(f);
    // If it's a builtin formation, also update the hook's formation
    if (["traditional", "stack", "spread", "rightSlant", "leftSlant"].includes(f)) {
      setFormation(f as FormationType);
    }
  }, [setFormation]);

  // Handle create formation
  const handleCreateFormation = useCallback(() => {
    setEditorMode("create");
    setEditingFormation(null);
    setInitialTemplateId(undefined);
    setEditorOpen(true);
  }, []);

  // Handle edit formation
  const handleEditFormation = useCallback((id: string) => {
    const formation = getById(id);
    if (formation) {
      setEditorMode("edit");
      setEditingFormation(formation);
      setInitialTemplateId(undefined);
      setEditorOpen(true);
    }
  }, [getById]);

  // Handle duplicate formation
  const handleDuplicateFormation = useCallback((formation: UserFormation) => {
    setEditorMode("duplicate");
    setEditingFormation(formation);
    setInitialTemplateId(undefined);
    setEditorOpen(true);
  }, []);

  // Handle share formation
  const handleShareFormation = useCallback((formation: UserFormation) => {
    setSharingFormation(formation);
    setShareDialogOpen(true);
  }, []);

  // Handle delete formation
  const handleDeleteFormation = useCallback(async (id: string) => {
    if (window.confirm("Are you sure you want to delete this formation?")) {
      await remove(id);
      // If the deleted formation was selected, switch back to traditional
      if (selectedFormationId === id) {
        setSelectedFormationId("traditional");
        setFormation("traditional");
      }
    }
  }, [remove, selectedFormationId, setFormation]);

  // Handle save formation from editor
  const handleSaveFormation = useCallback(
    async (data: {
      name: string;
      description?: string;
      tags?: string[];
      visibility: FormationVisibility;
      data: FormationData;
    }) => {
      if (editorMode === "edit" && editingFormation) {
        await update(editingFormation.id, {
          name: data.name,
          description: data.description,
          tags: data.tags,
          visibility: data.visibility,
          data: data.data,
        });
      } else {
        const newFormation = await create(data.name, data.data, {
          description: data.description,
          tags: data.tags,
          visibility: data.visibility,
          baseSource: editingFormation
            ? { type: "custom", id: editingFormation.id }
            : initialTemplateId
            ? { type: "template", id: initialTemplateId }
            : undefined,
        });
        // Select the newly created formation
        setSelectedFormationId(newFormation.id);
      }
    },
    [editorMode, editingFormation, initialTemplateId, create, update]
  );

  // Handle sign in click
  const handleSignInClick = useCallback(() => {
    router.push(signInHref("/tools/volleyball-rotations"));
  }, [router]);

  return (
    <>
      {/* Masthead */}
      <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex items-center gap-4">
          <h1 className="matchbook-display whitespace-nowrap text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
            5-1 <span className="text-mb-coral">Rotation Lab</span>
          </h1>
          <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
            <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
              R{rotation}
            </span>
            <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.18em]">
              {mode === "serving" ? "Serve" : "Receive"}
            </span>
          </div>
          <p className="mb-kicker hidden max-w-[220px] sm:block">
            All six rotations with overlap rules, formations, and movement
            transitions.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated && (
            <Link
              href="/tools/volleyball-rotations/my-formations"
              className="mb-btn mb-btn-navy"
            >
              <MbIcon id="save" size={14} />
              My Formations
            </Link>
          )}
          <button
            type="button"
            onClick={isAuthenticated ? handleCreateFormation : handleSignInClick}
            className="mb-btn mb-btn-coral"
          >
            <MbIcon id="plus" size={14} />
            Create Formation
          </button>
        </div>
      </header>

      {/* Rotation controls strip */}
      <div className="mb-panel mb-4 h-auto!">
        <div className="p-4">
          <RotationControls
            rotation={rotation}
            mode={mode}
            liberoActive={liberoActive}
            showOverlaps={showOverlaps}
            showArrows={showArrows}
            onRotationChange={setRotation}
            onModeChange={setMode}
            onLiberoToggle={setLiberoActive}
            onShowOverlapsToggle={setShowOverlaps}
            onShowArrowsToggle={setShowArrows}
            onNext={nextRotation}
            onPrev={prevRotation}
          />
        </div>
      </div>

      {/* Custom formation indicator */}
      {selectedCustomFormation && (
        <div className="mb-panel mb-4 h-auto!">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="mb-kicker">Custom Formation</p>
              <p className="matchbook-display text-[1rem] font-bold">
                {selectedCustomFormation.name}
              </p>
              {selectedCustomFormation.description && (
                <p className="text-[0.76rem] text-mb-ink-muted">
                  {selectedCustomFormation.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleFormationChange("traditional")}
              className="mb-btn mb-btn-outline-navy px-3 py-1.5 text-[0.72rem]"
            >
              Switch to Built-in
            </button>
          </div>
        </div>
      )}

      {/* Court + guide grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel title="Court Diagram">
            <div className="p-4">
              <VolleyballCourt
                players={players}
                overlaps={overlaps}
                arrows={arrows}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
                mode={mode}
                showOverlaps={showOverlaps}
                showArrows={showArrows}
              />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <Panel title="Position Guide">
            <div className="p-4">
              <LegendPanel
                players={players}
                rotation={rotation}
                mode={mode}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
              />
            </div>
          </Panel>

          <Panel title="Rotation Notes">
            <div className="p-4">
              <HelpAccordion />
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-12">
          <Panel title="Formations">
            <div className="p-4">
              <FormationSelector
                enhanced={true}
                formation={selectedFormationId}
                rotation={rotation}
                onFormationChange={handleFormationChange}
                isAuthenticated={isAuthenticated}
                userFormations={userFormations}
                onCreateFormation={handleCreateFormation}
                onEditFormation={handleEditFormation}
                onDuplicateFormation={handleDuplicateFormation}
                onShareFormation={handleShareFormation}
                onDeleteFormation={handleDeleteFormation}
                onSignInClick={handleSignInClick}
              />
            </div>
          </Panel>
        </div>
      </div>

      {/* Editor Modal */}
      <FormationEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveFormation}
        mode={editorMode}
        existingFormation={editingFormation || undefined}
        initialTemplateId={initialTemplateId}
      />

      {/* Share Dialog */}
      <ShareFormationDialog
        isOpen={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          setSharingFormation(null);
        }}
        formation={sharingFormation}
        onEnableSharing={share}
        onDisableSharing={unshare}
      />
    </>
  );
}
