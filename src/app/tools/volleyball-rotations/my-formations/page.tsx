"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { FormationCard, FormationEditorModal, ShareFormationDialog } from "@/components/volleyball";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useUserFormations } from "@/hooks/useUserFormations";
import { getTemplateFormations, cloneFormationData } from "@/lib/volleyball/templateFormations";
import type { UserFormation, FormationData, FormationVisibility } from "@/lib/volleyball/types";
import { MotionDiv, slideUp } from "@/components/motion";

export default function MyFormationsPage() {
  const { isLoading: authLoading, isAuthenticated, user } = useRequireAuth();
  const {
    formations,
    isLoading: formationsLoading,
    error,
    create,
    update,
    remove,
    duplicate,
    share,
    unshare,
  } = useUserFormations();

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "duplicate">("create");
  const [editingFormation, setEditingFormation] = useState<UserFormation | null>(null);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>();

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingFormation, setSharingFormation] = useState<UserFormation | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setSharingFormation(formation);
    setShareDialogOpen(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (formationId: string) => {
      if (deletingId === formationId) {
        await remove(formationId);
        setDeletingId(null);
      } else {
        setDeletingId(formationId);
        // Reset after 3 seconds if not confirmed
        setTimeout(() => setDeletingId(null), 3000);
      }
    },
    [deletingId, remove]
  );

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/tools/volleyball-rotations"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Back to Rotations
            </Link>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            My <span className="text-primary">Formations</span>
          </h1>
          <p className="text-muted-foreground">
            Create, manage, and share your custom volleyball formations
          </p>
        </MotionDiv>

        {/* Create New Section */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">Create New Formation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleCreateNew(template.id)}
                className="p-4 rounded-xl border-2 border-dashed border-border hover:border-primary text-left transition-all hover:bg-accent/30"
              >
                <div className="font-semibold text-sm mb-1">
                  Start from {template.name}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </div>
              </button>
            ))}
          </div>
        </MotionDiv>

        {/* Formations List */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Your Formations ({formations.length})
            </h2>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm mb-4">
              {error.message}
            </div>
          )}

          {formationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : formations.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-accent/30 border border-border">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any formations yet.
              </p>
              <button
                type="button"
                onClick={() => handleCreateNew()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
              >
                Create Your First Formation
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formations.map((formation) => (
                <div key={formation.id} className="relative">
                  <FormationCard
                    formation={formation}
                    isSelected={false}
                    isOwner={true}
                    onSelect={() => {}}
                    onEdit={() => handleEdit(formation)}
                    onDuplicate={() => handleDuplicate(formation)}
                    onShare={() => handleOpenShare(formation)}
                    onDelete={() => handleDelete(formation.id)}
                  />
                  {/* Delete confirmation overlay */}
                  {deletingId === formation.id && (
                    <div className="absolute inset-0 bg-red-500/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <div className="bg-background p-4 rounded-lg shadow-lg text-center">
                        <p className="text-sm font-medium mb-2">Delete this formation?</p>
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-1 text-sm bg-accent rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(formation.id)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </MotionDiv>
      </main>

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
