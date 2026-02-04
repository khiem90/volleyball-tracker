"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FormationEditorCourt } from "./FormationEditorCourt";
import { useFormationEditor } from "@/hooks/useFormationEditor";
import type {
  FormationData,
  UserFormation,
  RotationNumber,
  GameMode,
  FormationVisibility,
  PlayerRole,
  CourtPosition,
} from "@/lib/volleyball/types";
import { getTemplateFormations } from "@/lib/volleyball/templateFormations";

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

        // Get the player's current position as the arrow start
        const playerPos = editor.currentFrame.roleSpots[arrowStartRole];
        if (!playerPos) return;

        // Create the arrow
        editor.updateMovementArrow(arrowStartRole, playerPos, position);

        // Stay in draw mode for drawing more arrows, just reset source selection
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

    const templates = getTemplateFormations();

    const rotationButtons: RotationNumber[] = [1, 2, 3, 4, 5, 6];

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
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
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
              <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-6">
                  {/* Left Sidebar - Controls & Metadata (independently scrollable) */}
                  <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-2 scrollbar-thin">
                    {/* Movement Arrows - First for easy access */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Movement Arrows
                      </h3>

                      {/* Draw Arrow Button / Drawing State */}
                      {isDrawingArrow ? (
                        <div className="space-y-2">
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              <span className="text-xs font-medium text-primary">
                                {arrowStartRole
                                  ? `Click on the court where ${arrowStartRole} should move`
                                  : "Click a player to start drawing"}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleDoneDrawing}
                              className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                            >
                              Done
                            </button>
                            {arrowStartRole && (
                              <button
                                type="button"
                                onClick={() => setArrowStartRole(null)}
                                className="px-3 py-1.5 text-sm bg-accent rounded-lg hover:bg-accent/80"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartDrawingArrow}
                          className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                          Draw Arrow
                        </button>
                      )}

                      {/* Arrow List - Compact horizontal layout */}
                      {arrowEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {arrowEntries.map(([role]) => (
                            <div
                              key={role}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 text-xs"
                            >
                              <span className="font-medium">{role}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveArrow(role)}
                                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
                                aria-label={`Remove arrow for ${role}`}
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rotation & Mode Controls */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Rotation Navigator
                      </h3>

                      {/* Rotation Selector */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Rotation</label>
                        <div className="flex gap-1">
                          {rotationButtons.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => editor.setCurrentRotation(r)}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                                editor.currentRotation === r
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-accent hover:bg-accent/80"
                              }`}
                            >
                              R{r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode Toggle */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Mode</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editor.setCurrentMode("serving")}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editor.currentMode === "serving"
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent hover:bg-accent/80"
                            }`}
                          >
                            Serving
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.setCurrentMode("receiving")}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editor.currentMode === "receiving"
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent hover:bg-accent/80"
                            }`}
                          >
                            Receiving
                          </button>
                        </div>
                      </div>

                      {/* Libero Toggle */}
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editor.liberoActive}
                            onChange={(e) => editor.setLiberoActive(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium">Show Libero</span>
                        </label>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Quick Actions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={editor.copyCurrentFrame}
                          className="px-3 py-1.5 text-sm bg-accent rounded-lg hover:bg-accent/80"
                        >
                          Copy Frame
                        </button>
                        <button
                          type="button"
                          onClick={editor.pasteFrame}
                          disabled={!editor.hasCopiedFrame}
                          className="px-3 py-1.5 text-sm bg-accent rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Paste Frame
                        </button>
                        <button
                          type="button"
                          onClick={editor.resetCurrentRotation}
                          className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                        >
                          Reset Rotation
                        </button>
                      </div>
                    </div>

                    {/* Formation Details - Collapsible */}
                    <div className="space-y-2 border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => setDetailsExpanded(!detailsExpanded)}
                        className="w-full flex items-center justify-between text-left"
                        aria-expanded={detailsExpanded}
                        aria-controls="formation-details-content"
                      >
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                          Formation Details
                        </h3>
                        <svg
                          className={`w-4 h-4 text-muted-foreground transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence initial={false}>
                        {detailsExpanded && (
                          <motion.div
                            id="formation-details-content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-4 pt-1">
                              {/* Name */}
                              <div>
                                <label
                                  htmlFor="formation-name"
                                  className="block text-sm font-medium mb-1"
                                >
                                  Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  id="formation-name"
                                  type="text"
                                  value={editor.metadata.name}
                                  onChange={(e) => editor.setName(e.target.value)}
                                  placeholder="My Custom Formation"
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label
                                  htmlFor="formation-description"
                                  className="block text-sm font-medium mb-1"
                                >
                                  Description
                                </label>
                                <textarea
                                  id="formation-description"
                                  value={editor.metadata.description}
                                  onChange={(e) => editor.setDescription(e.target.value)}
                                  placeholder="Notes about this formation..."
                                  rows={3}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                              </div>

                              {/* Tags */}
                              <div>
                                <label
                                  htmlFor="formation-tags"
                                  className="block text-sm font-medium mb-1"
                                >
                                  Tags (comma separated)
                                </label>
                                <input
                                  id="formation-tags"
                                  type="text"
                                  value={editor.metadata.tags.join(", ")}
                                  onChange={(e) =>
                                    editor.setTags(
                                      e.target.value
                                        .split(",")
                                        .map((t) => t.trim())
                                        .filter(Boolean)
                                    )
                                  }
                                  placeholder="stack, 4-pass, advanced"
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>

                              {/* Visibility */}
                              <div>
                                <label className="block text-sm font-medium mb-2">Visibility</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => editor.setVisibility("private")}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      editor.metadata.visibility === "private"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-accent hover:bg-accent/80"
                                    }`}
                                  >
                                    Private
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => editor.setVisibility("unlisted")}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      editor.metadata.visibility === "unlisted"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-accent hover:bg-accent/80"
                                    }`}
                                  >
                                    Unlisted (Shareable)
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Validation Errors */}
                    {(editor.blockingErrors.length > 0 || editor.overlapWarnings.length > 0) && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                          Validation
                        </h3>

                        {editor.blockingErrors.length > 0 && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm">
                            <p className="font-medium text-red-700 dark:text-red-300 mb-1">
                              Errors ({editor.blockingErrors.length})
                            </p>
                            <ul className="text-red-600 dark:text-red-400 text-xs space-y-1">
                              {editor.blockingErrors.slice(0, 3).map((err, i) => (
                                <li key={i}>{err.message}</li>
                              ))}
                              {editor.blockingErrors.length > 3 && (
                                <li>...and {editor.blockingErrors.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {editor.overlapWarnings.length > 0 && (
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-sm">
                            <p className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                              Overlap Warnings ({editor.overlapWarnings.length})
                            </p>
                            <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                              Some positions may violate overlap rules.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right - Court Editor (sticky on large screens) */}
                  <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
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
                      <p className="text-xs mt-1">Shift + Arrow for larger steps • Press Esc to cancel</p>
                    </div>
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
