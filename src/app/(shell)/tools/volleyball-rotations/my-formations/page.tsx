"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FormationCard, FormationEditorModal, ShareFormationDialog } from "@/components/volleyball";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useUserFormations } from "@/hooks/useUserFormations";
import { getTemplateFormations } from "@/lib/volleyball/templateFormations";
import { formationDesignerHref } from "@/lib/volleyball/formationLinks";
import type { UserFormation, FormationData, FormationVisibility } from "@/lib/volleyball/types";
import { MotionDiv, slideUp } from "@/components/motion";
import {
  CARD_ROW,
  Card,
  CardEmpty,
  CardError,
  DeleteConfirmDialog,
  Icon,
  PageLoadingSpinner,
} from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";

export default function MyFormationsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const {
    formations,
    isLoading: formationsLoading,
    error,
    create,
    update,
    remove,
    share,
    unshare,
    getById,
  } = useUserFormations();

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "duplicate">("create");
  const [editingFormation, setEditingFormation] = useState<UserFormation | null>(null);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>();

  // Share dialog state. The dialog gets the live formation by id so it sees
  // sharing turn on and off.
  const [sharingFormationId, setSharingFormationId] = useState<string | null>(null);
  const sharingFormation = sharingFormationId ? getById(sharingFormationId) ?? null : null;

  // Delete confirmation state. The dialog names the formation, and keeps the
  // name while it closes, so its words do not change on the way out.
  const [deleteTarget, setDeleteTarget] = useState<UserFormation | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const templates = getTemplateFormations();

  // Handle create new formation
  const handleCreateNew = useCallback((templateId?: string) => {
    setEditorMode("create");
    setEditingFormation(null);
    setInitialTemplateId(templateId);
    setEditorOpen(true);
  }, []);

  // Handle edit formation
  const handleEdit = useCallback((formation: UserFormation) => {
    setEditorMode("edit");
    setEditingFormation(formation);
    setInitialTemplateId(undefined);
    setEditorOpen(true);
  }, []);

  // Handle duplicate formation
  const handleDuplicate = useCallback((formation: UserFormation) => {
    setEditorMode("duplicate");
    setEditingFormation(formation);
    setInitialTemplateId(undefined);
    setEditorOpen(true);
  }, []);

  // Handle save formation
  const handleSave = useCallback(
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
        await create(data.name, data.data, {
          description: data.description,
          tags: data.tags,
          visibility: data.visibility,
          baseSource: editingFormation
            ? { type: "custom", id: editingFormation.id }
            : initialTemplateId
            ? { type: "template", id: initialTemplateId }
            : undefined,
        });
      }
    },
    [editorMode, editingFormation, initialTemplateId, create, update]
  );

  // Handle share
  const handleOpenShare = useCallback((formation: UserFormation) => {
    setSharingFormationId(formation.id);
  }, []);

  // Delete the formation the dialog is asking about
  const handleAskDelete = useCallback((formation: UserFormation) => {
    setDeleteTarget(formation);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, remove]);

  // Loading state
  if (authLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  return (
    <>
      <PageHeader
        back={{ href: "/tools/volleyball-rotations", label: "Back to Rotations" }}
        title="My Formations"
        line="Create, manage, and share your custom volleyball formations"
      />

      {/* Start-aligned so each card is as tall as its rows, not its column. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* Create New Section */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="min-w-0 lg:col-span-5"
        >
          <Card title="Create New Formation" icon="plus">
            <ul className="divide-y divide-line">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => handleCreateNew(template.id)}
                    className={`flex w-full items-center gap-3 text-left ${CARD_ROW}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-title font-semibold leading-snug wrap-anywhere">
                        Start from {template.name}
                      </span>
                      <span className="line-clamp-2 text-caption text-ink-soft">
                        {template.description}
                      </span>
                    </span>
                    <Icon id="plus" size={14} className="shrink-0 text-ink-soft" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </MotionDiv>

        {/* Formations List */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="min-w-0 lg:col-span-7"
        >
          <Card title={`Your Formations (${formations.length})`} icon="save">
            {error && <CardError message={error.message} />}

            {formationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <span
                  className="spinner size-8 text-ink-soft"
                  role="status"
                  aria-label="Loading formations"
                />
              </div>
            ) : formations.length === 0 ? (
              <CardEmpty
                message="You haven't created any formations yet."
                action={
                  <button type="button" onClick={() => handleCreateNew()} className="btn btn-ink">
                    Create Your First Formation
                  </button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3 p-4">
                {formations.map((formation) => (
                  <FormationCard
                    key={formation.id}
                    formation={formation}
                    isSelected={false}
                    isOwner={true}
                    onSelect={() => router.push(formationDesignerHref(formation.id))}
                    onEdit={() => handleEdit(formation)}
                    onDuplicate={() => handleDuplicate(formation)}
                    onShare={() => handleOpenShare(formation)}
                    onDelete={() => handleAskDelete(formation)}
                  />
                ))}
              </div>
            )}
          </Card>
        </MotionDiv>
      </div>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this formation?"
        description={`${deleteTarget?.name ?? "It"} will be removed from your formations.`}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Editor Modal */}
      <FormationEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
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
}
