"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-6xl max-h-[90vh] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold">
                  {mode === "create" && "Create Formation"}
                  {mode === "edit" && "Edit Formation"}
                  {mode === "duplicate" && "Duplicate Formation"}
                </h2>
                <div className="flex items-center gap-3">
                  {editor.hasUnsavedChanges && (
                    <span className="text-sm text-muted-foreground">Unsaved changes</span>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    aria-label="Close editor"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Draft Prompt */}
              {showDraftPrompt && (
                <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
                  <span className="text-sm">You have an unsaved draft. Would you like to continue?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLoadDraft}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      Load Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="px-3 py-1 text-sm bg-accent rounded-lg hover:bg-accent/80"
                    >
                      Start Fresh
                    </button>
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 p-6">
                  {/* Left Sidebar - Controls & Metadata */}
                  <div className="lg:w-80 shrink-0 space-y-4 overflow-y-auto min-h-0 px-2 scrollbar-thin">
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
                  <div className="flex-1 min-w-0 space-y-4">
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
                    <div className="text-center text-sm text-muted-foreground">
                      <p>Drag players to reposition. Use arrow keys for fine adjustments.</p>
                      <p className="text-xs mt-1">Shift + Arrow for larger steps • Ctrl + Arrow for fast moves • Press Esc to cancel</p>
                    </div>
                  </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-accent/30">
                {saveError && (
                  <p className="text-sm text-red-500">{saveError}</p>
                )}
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !editor.metadata.name.trim()}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
FormationEditorModal.displayName = "FormationEditorModal";
