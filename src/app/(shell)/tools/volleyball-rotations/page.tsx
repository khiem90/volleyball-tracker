"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Chip, Icon, PageLoadingSpinner } from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
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
import { isBuiltinFormation } from "@/lib/volleyball/formations";
import { resolveFormation } from "@/lib/volleyball/formationChoice";
import { formationIdIn } from "@/lib/volleyball/formationLinks";
import { signInHref } from "@/lib/shell";

const RotationLab = () => {
  const router = useRouter();
  // My Formations opens a saved formation here by its id.
  const linkedFormationId = formationIdIn(useSearchParams());
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

  // Currently selected formation (a builtin type, a template ID, or a custom ID)
  const [selectedFormationId, setSelectedFormationId] = useState<FormationType | string>(
    linkedFormationId ?? "traditional"
  );

  // Template and custom formations carry their own positions; builtins are
  // drawn from the rotation chart by the hook's formation type.
  const chosenFormation = useMemo(
    () => resolveFormation(selectedFormationId, userFormations),
    [selectedFormationId, userFormations]
  );
  const templateOrCustom =
    chosenFormation && chosenFormation.source !== "builtin" ? chosenFormation : null;

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
    initialFormation: chosenFormation?.source === "builtin" ? chosenFormation.type : undefined,
    customFormationData: templateOrCustom?.data ?? null,
  });

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showArrows, setShowArrows] = useState(true);

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "duplicate">("create");
  const [editingFormation, setEditingFormation] = useState<UserFormation | null>(null);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>();

  // Share dialog state. The dialog gets the live formation by id so it sees
  // sharing turn on and off.
  const [sharingFormationId, setSharingFormationId] = useState<string | null>(null);
  const sharingFormation = sharingFormationId ? getById(sharingFormationId) ?? null : null;

  // Handle formation change (builtin, template, or custom)
  const handleFormationChange = useCallback((f: FormationType | string) => {
    setSelectedFormationId(f);
    // If it's a builtin formation, also update the hook's formation
    if (isBuiltinFormation(f)) {
      setFormation(f);
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
    setSharingFormationId(formation.id);
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
      <PageHeader
        title="5-1 Rotation Lab"
        status={
          <Chip>
            R{rotation} • {mode === "serving" ? "Serve" : "Receive"}
          </Chip>
        }
        line="All six rotations with overlap rules, formations, and movement transitions."
        action={
          <>
            {/* On a phone the green button comes first and this one sits under it. */}
            {isAuthenticated && (
              <Link
                href="/tools/volleyball-rotations/my-formations"
                className="btn btn-fill order-last sm:order-none"
              >
                <Icon id="save" size={14} />
                My Formations
              </Link>
            )}
            <button
              type="button"
              onClick={isAuthenticated ? handleCreateFormation : handleSignInClick}
              className="btn btn-action"
            >
              <Icon id="plus" size={18} />
              Create Formation
            </button>
          </>
        }
      />

      {/* Rotation controls strip */}
      <Card className="mb-4 h-auto">
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
      </Card>

      {/* Template or custom formation indicator */}
      {templateOrCustom && (
        <Card className="mb-4 h-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-caption font-medium text-ink-soft">
                {templateOrCustom.source === "template" ? "Template Formation" : "Custom Formation"}
              </p>
              <p className="text-title font-bold wrap-anywhere">{templateOrCustom.name}</p>
              {templateOrCustom.description && (
                <p className="text-label text-ink-soft">{templateOrCustom.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleFormationChange("traditional")}
              className="btn btn-fill"
            >
              Switch to Built-in
            </button>
          </div>
        </Card>
      )}

      {/* Court + guide grid. Start-aligned so each card is as tall as what it holds. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <Card title="Court Diagram" icon="court">
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
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
          <Card title="Position Guide" icon="teams">
            <div className="p-4">
              <LegendPanel
                players={players}
                rotation={rotation}
                mode={mode}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
              />
            </div>
          </Card>

          <Card title="Rotation Notes" icon="help">
            <div className="p-4">
              <HelpAccordion />
            </div>
          </Card>
        </div>

        <div className="min-w-0 xl:col-span-12">
          <Card title="Formations" icon="clipboard">
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
          </Card>
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
        isOpen={sharingFormation !== null}
        onClose={() => setSharingFormationId(null)}
        formation={sharingFormation}
        onEnableSharing={share}
        onDisableSharing={unshare}
      />
    </>
  );
};

// useSearchParams, which reads the linked formation, needs a Suspense boundary.
export default function VolleyballRotationsPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <RotationLab />
    </Suspense>
  );
}
