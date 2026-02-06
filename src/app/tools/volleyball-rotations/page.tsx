"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
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
import { MotionDiv, slideUp } from "@/components/motion";
import type { FormationType, UserFormation, FormationData, FormationVisibility } from "@/lib/volleyball/types";

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
    router.push(`/login?redirect=${encodeURIComponent("/tools/volleyball-rotations")}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 uppercase">
            5-1 Volleyball <span className="text-primary">Rotations</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Interactive visualization of all 6 rotations with overlap rules,
            formation variants, and movement transitions
          </p>
          {/* My Formations Link */}
          {isAuthenticated && (
            <Link
              href="/tools/volleyball-rotations/my-formations"
              className="inline-block mt-4 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              Manage My Formations
            </Link>
          )}
        </MotionDiv>

        {/* Custom Formation Indicator */}
        {selectedCustomFormation && (
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  Custom Formation
                </span>
                <h2 className="text-lg font-bold">{selectedCustomFormation.name}</h2>
                {selectedCustomFormation.description && (
                  <p className="text-sm text-muted-foreground">{selectedCustomFormation.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleFormationChange("traditional")}
                className="px-3 py-1 text-sm bg-background rounded-lg hover:bg-accent transition-colors"
              >
                Switch to Built-in
              </button>
            </div>
          </MotionDiv>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left Column: Court + Controls */}
          <div className="space-y-6">
            {/* Controls Card */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
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

            {/* Court Visualization Card */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
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

            {/* Formation Selector Card - Enhanced Mode */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
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

            {/* Help Accordion (visible on mobile, hidden on lg) */}
            <div className="lg:hidden">
              <HelpAccordion />
            </div>
          </div>

          {/* Right Sidebar: Legend */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
            {/* Legend Panel */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <LegendPanel
                players={players}
                rotation={rotation}
                mode={mode}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
              />
            </div>

            {/* Help Accordion (hidden on mobile, visible on lg) */}
            <div className="hidden lg:block">
              <HelpAccordion />
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
}
