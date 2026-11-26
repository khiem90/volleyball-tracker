"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/shared/Icon";
import { FormationEditorCourt } from "./FormationEditorCourt";
import { useFormationEditor } from "@/hooks/useFormationEditor";
import type {
  FormationData,
  UserFormation,
  FormationVisibility,
  PlayerRole,
  CourtPosition,
} from "@/lib/volleyball/types";
import {
  ArrowControls,
  RotationNavigator,
  QuickActions,
  FormationDetails,
  ValidationPanel,
} from "./formation-editor";

type EditorMode = "create" | "edit" | "duplicate";

type FormationEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    tags?: string[];
    visibility: FormationVisibility;
    data: FormationData;
  }) => Promise<void>;
  mode: EditorMode;
  existingFormation?: UserFormation;
  initialTemplateId?: string;
  initialData?: FormationData;
};

export const FormationEditorModal = memo(
  ({
    isOpen,
    onClose,
    onSave,
    mode,
    existingFormation,
    initialTemplateId,
    initialData,
  }: FormationEditorModalProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);

    // Arrow drawing state
    const [isDrawingArrow, setIsDrawingArrow] = useState(false);
    const [arrowStartRole, setArrowStartRole] = useState<PlayerRole | null>(null);

    // Collapsible Formation Details (expanded by default for create mode)
    const [detailsExpanded, setDetailsExpanded] = useState(mode === "create");

    const editor = useFormationEditor({
      mode,
      existingFormation,
      templateId: initialTemplateId,
      initialData,
    });

    // Check for draft on mount
    useEffect(() => {
      if (isOpen && mode === "create" && editor.hasDraft) {
        setShowDraftPrompt(true);
      }
    }, [isOpen, mode, editor.hasDraft]);

    const handleLoadDraft = useCallback(() => {
      editor.loadDraft();
      setShowDraftPrompt(false);
    }, [editor]);

    const handleDiscardDraft = useCallback(() => {
      editor.clearDraft();
      setShowDraftPrompt(false);
    }, [editor]);

    // Arrow drawing handlers
    const handleStartDrawingArrow = useCallback(() => {
      setIsDrawingArrow(true);
      setArrowStartRole(null);
    }, []);

    const handleCancelDrawingArrow = useCallback(() => {
      setIsDrawingArrow(false);
      setArrowStartRole(null);
    }, []);

    const handleArrowStartSelect = useCallback((role: PlayerRole) => {
      setArrowStartRole(role);
    }, []);

    const handleArrowEndSelect = useCallback(
      (position: CourtPosition) => {
        if (!arrowStartRole || !editor.currentFrame) return;

        const playerPos = editor.currentFrame.roleSpots[arrowStartRole];
        if (!playerPos) return;

        editor.updateMovementArrow(arrowStartRole, playerPos, position);
        setArrowStartRole(null);
      },
      [arrowStartRole, editor]
    );

    const handleDoneDrawing = useCallback(() => {
      setIsDrawingArrow(false);
      setArrowStartRole(null);
    }, []);

    const handleRemoveArrow = useCallback(
      (role: PlayerRole) => {
        editor.removeMovementArrow(role);
      },
      [editor]
    );

    // Get current arrows for display
    const currentArrows = editor.currentFrame?.movementArrows || {};
    const arrowEntries = Object.entries(currentArrows).filter(
      ([, arrow]) => arrow !== undefined
    ) as [PlayerRole, { from: CourtPosition; to: CourtPosition }][];

    const handleSave = useCallback(async () => {
      if (!editor.metadata.name.trim()) {
        setSaveError("Formation name is required");
        return;
      }

      if (editor.hasBlockingErrors) {
        setSaveError("Please fix validation errors before saving");
        return;
      }

      setIsSaving(true);
      setSaveError(null);

      try {
        const formationToSave = editor.getFormationForSave();
        await onSave(formationToSave);
        editor.clearDraft();
        onClose();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save formation");
      } finally {
        setIsSaving(false);
      }
    }, [editor, onSave, onClose]);

    const handleClose = useCallback(() => {
      if (editor.hasUnsavedChanges) {
        editor.saveDraft();
      }
      onClose();
    }, [editor, onClose]);

    // Escape closes the dialog, but first it belongs to what is under way:
    // the court clears its own selection, and a half-drawn arrow is cancelled.
    const handleEscape = useCallback(
      (event: KeyboardEvent) => {
        const inCourt =
          event.target instanceof Element &&
          event.target.closest("[data-formation-court]") !== null;
        if (inCourt) {
          event.preventDefault();
          return;
        }
        if (isDrawingArrow) {
          event.preventDefault();
          handleCancelDrawingArrow();
        }
      },
      [isDrawingArrow, handleCancelDrawingArrow]
    );

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          onEscapeKeyDown={handleEscape}
          className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        >
          {/* Header. The right padding keeps it clear of the dialog's close control. */}
          <div className="flex min-h-15 flex-wrap items-center justify-between gap-x-3 border-b border-line py-2 pr-14 pl-4 sm:pl-6">
            <DialogTitle>
              <Icon id="court" size={18} className="shrink-0" />
              {mode === "create" && "Create Formation"}
              {mode === "edit" && "Edit Formation"}
              {mode === "duplicate" && "Duplicate Formation"}
            </DialogTitle>
            {editor.hasUnsavedChanges && (
              <span className="text-caption text-ink-soft">Unsaved changes</span>
            )}
          </div>

          {/* Draft Prompt */}
          {showDraftPrompt && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-action-tint px-4 py-3 sm:px-6">
              <span className="text-label">
                You have an unsaved draft. Would you like to continue?
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={handleLoadDraft} className="btn btn-ink px-4">
                  Load Draft
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="btn bg-surface px-4 text-ink hover:bg-fill"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          )}

          {/*
           * Main Content. On a phone this is the one part that scrolls, with
           * the court first so it is in reach, and the header and footer stay
           * put. From lg up the controls and the court sit side by side and
           * each scrolls on its own.
           */}
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
            {/* Left Sidebar - Controls & Metadata */}
            <div className="scrollbar-thin flex shrink-0 flex-col gap-4 lg:min-h-0 lg:w-80 lg:overflow-y-auto lg:px-1">
              <ArrowControls
                isDrawingArrow={isDrawingArrow}
                arrowStartRole={arrowStartRole}
                arrowEntries={arrowEntries}
                onStartDrawing={handleStartDrawingArrow}
                onDoneDrawing={handleDoneDrawing}
                onCancelSelection={() => setArrowStartRole(null)}
                onRemoveArrow={handleRemoveArrow}
              />

              <RotationNavigator
                currentRotation={editor.currentRotation}
                currentMode={editor.currentMode}
                liberoActive={editor.liberoActive}
                onRotationChange={editor.setCurrentRotation}
                onModeChange={editor.setCurrentMode}
                onLiberoChange={editor.setLiberoActive}
              />

              <QuickActions
                hasCopiedFrame={editor.hasCopiedFrame}
                onCopyFrame={editor.copyCurrentFrame}
                onPasteFrame={editor.pasteFrame}
                onResetRotation={editor.resetCurrentRotation}
              />

              <FormationDetails
                expanded={detailsExpanded}
                onToggleExpanded={() => setDetailsExpanded(!detailsExpanded)}
                name={editor.metadata.name}
                description={editor.metadata.description}
                tags={editor.metadata.tags}
                visibility={editor.metadata.visibility}
                onNameChange={editor.setName}
                onDescriptionChange={editor.setDescription}
                onTagsChange={editor.setTags}
                onVisibilityChange={editor.setVisibility}
              />

              <ValidationPanel
                blockingErrors={editor.blockingErrors}
                overlapWarnings={editor.overlapWarnings}
              />
            </div>

            {/* Right - Court Editor */}
            <div className="order-first flex shrink-0 flex-col gap-4 lg:order-none lg:min-h-0 lg:min-w-0 lg:flex-1 lg:overflow-y-auto">
              {editor.currentFrame && (
                <FormationEditorCourt
                  frame={editor.currentFrame}
                  rotation={editor.currentRotation}
                  mode={editor.currentMode}
                  liberoActive={editor.liberoActive}
                  selectedRole={editor.selectedRole}
                  onSelectRole={editor.setSelectedRole}
                  onPositionChange={editor.updatePlayerPosition}
                  onDragStart={() => editor.setIsDragging(true)}
                  onDragEnd={() => editor.setIsDragging(false)}
                  isDrawingArrow={isDrawingArrow}
                  arrowStartRole={arrowStartRole}
                  onArrowStartSelect={handleArrowStartSelect}
                  onArrowEndSelect={handleArrowEndSelect}
                  onArrowCancel={handleCancelDrawingArrow}
                />
              )}

              {/* Instructions */}
              <div className="text-center text-label text-ink-soft">
                <p>Drag players to reposition. Use arrow keys for fine adjustments.</p>
                <p className="mt-1 text-caption">
                  Shift + Arrow for larger steps • Ctrl + Arrow for fast moves • Press Esc to cancel
                </p>
              </div>
            </div>
          </div>

          {/* Footer. A solid surface, so what scrolls above it never shows through. */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface px-4 py-3 sm:px-6">
            {saveError && (
              <p role="alert" className="mr-auto text-label font-medium text-danger">
                {saveError}
              </p>
            )}
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !editor.metadata.name.trim()}
              className="px-6"
            >
              {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);
FormationEditorModal.displayName = "FormationEditorModal";
