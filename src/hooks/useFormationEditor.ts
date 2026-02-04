"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type {
  FormationData,
  RotationFrame,
  RotationNumber,
  GameMode,
  PlayerRole,
  CourtPosition,
  FormationVisibility,
  UserFormation,
  FormationValidationError,
} from "@/lib/volleyball/types";
import { cloneFormationData, getTemplateById } from "@/lib/volleyball/templateFormations";
import { validateFormation, isFormationValid, getBlockingErrors, getOverlapWarnings } from "@/lib/volleyball/formationValidation";

// ============================================
// Types
// ============================================

type EditorMode = "create" | "edit" | "duplicate";

type FormationMetadata = {
  name: string;
  description: string;
  tags: string[];
  visibility: FormationVisibility;
};

type UseFormationEditorOptions = {
  mode: EditorMode;
  initialData?: FormationData;
  existingFormation?: UserFormation;
  templateId?: string;
};

type UseFormationEditorReturn = {
  // Editor state
  currentRotation: RotationNumber;
  currentMode: GameMode;
  liberoActive: boolean;
  selectedRole: PlayerRole | null;
  isDragging: boolean;

  // Data
  formationData: FormationData;
  metadata: FormationMetadata;
  currentFrame: RotationFrame | undefined;

  // Dirty state
  hasUnsavedChanges: boolean;

  // Navigation
  setCurrentRotation: (r: RotationNumber) => void;
  setCurrentMode: (m: GameMode) => void;
  setLiberoActive: (active: boolean) => void;
  setSelectedRole: (role: PlayerRole | null) => void;
  setIsDragging: (dragging: boolean) => void;
  nextRotation: () => void;
  prevRotation: () => void;

  // Position editing
  updatePlayerPosition: (role: PlayerRole, position: CourtPosition) => void;
  updateMovementArrow: (
    role: PlayerRole,
    from: CourtPosition,
    to: CourtPosition
  ) => void;
  removeMovementArrow: (role: PlayerRole) => void;

  // Metadata editing
  setMetadata: (updates: Partial<FormationMetadata>) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setTags: (tags: string[]) => void;
  setVisibility: (visibility: FormationVisibility) => void;

  // Reset operations
  resetCurrentRotation: () => void;
  resetAllRotations: () => void;

  // Frame operations
  copyCurrentFrame: () => void;
  pasteFrame: () => void;
  hasCopiedFrame: boolean;
  applyCurrentFrameToAllRotations: () => void;

  // Validation
  validationErrors: FormationValidationError[];
  blockingErrors: FormationValidationError[];
  overlapWarnings: FormationValidationError[];
  isValid: boolean;
  hasBlockingErrors: boolean;

  // Draft management
  saveDraft: () => void;
  loadDraft: () => boolean;
  clearDraft: () => void;
  hasDraft: boolean;

  // Export
  getFormationForSave: () => {
    name: string;
    description?: string;
    tags?: string[];
    visibility: FormationVisibility;
    data: FormationData;
  };
};

// ============================================
// Constants
// ============================================

const DRAFT_STORAGE_KEY = "volleyball-formation-editor-draft";
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// ============================================
// Hook Implementation
// ============================================

export const useFormationEditor = (
  options: UseFormationEditorOptions
): UseFormationEditorReturn => {
  const { mode, initialData, existingFormation, templateId } = options;

  // Initialize formation data
  const getInitialData = (): FormationData => {
    if (initialData) {
      return cloneFormationData(initialData);
    }
    if (existingFormation) {
      return cloneFormationData(existingFormation.data);
    }
    if (templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        return cloneFormationData(template.data);
      }
    }
    // Default to neutral template
    const neutralTemplate = getTemplateById("neutral");
    return neutralTemplate ? cloneFormationData(neutralTemplate.data) : createEmptyFormationData();
  };

  // Initialize metadata
  const getInitialMetadata = (): FormationMetadata => {
    if (existingFormation) {
      return {
        name: mode === "duplicate" ? `${existingFormation.name} (Copy)` : existingFormation.name,
        description: existingFormation.description || "",
        tags: existingFormation.tags || [],
        visibility: mode === "duplicate" ? "private" : existingFormation.visibility,
      };
    }
    return {
      name: "",
      description: "",
      tags: [],
      visibility: "private",
    };
  };

  // State
  const [currentRotation, setCurrentRotation] = useState<RotationNumber>(1);
  const [currentMode, setCurrentMode] = useState<GameMode>("receiving");
  const [liberoActive, setLiberoActive] = useState(true);
  const [selectedRole, setSelectedRole] = useState<PlayerRole | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formationData, setFormationData] = useState<FormationData>(getInitialData);
  const [metadata, setMetadataState] = useState<FormationMetadata>(getInitialMetadata);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copiedFrame, setCopiedFrame] = useState<RotationFrame | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Refs for initial data comparison
  const initialDataRef = useRef<FormationData>(getInitialData());
  const initialMetadataRef = useRef<FormationMetadata>(getInitialMetadata());

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      setHasDraft(!!draft);
    }
  }, []);

  // Current frame
  const currentFrame = useMemo(() => {
    return formationData[currentMode]?.[currentRotation];
  }, [formationData, currentMode, currentRotation]);

  // Navigation
  const nextRotation = useCallback(() => {
    setCurrentRotation((prev) => (prev === 6 ? 1 : ((prev + 1) as RotationNumber)));
  }, []);

  const prevRotation = useCallback(() => {
    setCurrentRotation((prev) => (prev === 1 ? 6 : ((prev - 1) as RotationNumber)));
  }, []);

  // Update player position
  const updatePlayerPosition = useCallback(
    (role: PlayerRole, position: CourtPosition) => {
      setFormationData((prev) => {
        const newData = cloneFormationData(prev);
        const frame = newData[currentMode][currentRotation];
        if (frame) {
          frame.roleSpots[role] = position;
        }
        return newData;
      });
      setHasUnsavedChanges(true);
    },
    [currentMode, currentRotation]
  );

  // Update movement arrow
  const updateMovementArrow = useCallback(
    (role: PlayerRole, from: CourtPosition, to: CourtPosition) => {
      setFormationData((prev) => {
        const newData = cloneFormationData(prev);
        const frame = newData[currentMode][currentRotation];
        if (frame) {
          if (!frame.movementArrows) {
            frame.movementArrows = {};
          }
          frame.movementArrows[role] = { from, to };
        }
        return newData;
      });
      setHasUnsavedChanges(true);
    },
    [currentMode, currentRotation]
  );

  // Remove movement arrow
  const removeMovementArrow = useCallback(
    (role: PlayerRole) => {
      setFormationData((prev) => {
        const newData = cloneFormationData(prev);
        const frame = newData[currentMode][currentRotation];
        if (frame?.movementArrows) {
          delete frame.movementArrows[role];
        }
        return newData;
      });
      setHasUnsavedChanges(true);
    },
    [currentMode, currentRotation]
  );

  // Metadata setters
  const setMetadata = useCallback((updates: Partial<FormationMetadata>) => {
    setMetadataState((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  const setName = useCallback((name: string) => setMetadata({ name }), [setMetadata]);
  const setDescription = useCallback((description: string) => setMetadata({ description }), [setMetadata]);
  const setTags = useCallback((tags: string[]) => setMetadata({ tags }), [setMetadata]);
  const setVisibility = useCallback((visibility: FormationVisibility) => setMetadata({ visibility }), [setMetadata]);

  // Reset current rotation to initial/template
  const resetCurrentRotation = useCallback(() => {
    setFormationData((prev) => {
      const newData = cloneFormationData(prev);
      const initialFrame = initialDataRef.current[currentMode]?.[currentRotation];
      if (initialFrame) {
        newData[currentMode][currentRotation] = JSON.parse(JSON.stringify(initialFrame));
      }
      return newData;
    });
    setHasUnsavedChanges(true);
  }, [currentMode, currentRotation]);

  // Reset all rotations
  const resetAllRotations = useCallback(() => {
    setFormationData(cloneFormationData(initialDataRef.current));
    setHasUnsavedChanges(true);
  }, []);

  // Copy/paste frame
  const copyCurrentFrame = useCallback(() => {
    if (currentFrame) {
      setCopiedFrame(JSON.parse(JSON.stringify(currentFrame)));
    }
  }, [currentFrame]);

  const pasteFrame = useCallback(() => {
    if (copiedFrame) {
      setFormationData((prev) => {
        const newData = cloneFormationData(prev);
        newData[currentMode][currentRotation] = JSON.parse(JSON.stringify(copiedFrame));
        return newData;
      });
      setHasUnsavedChanges(true);
    }
  }, [copiedFrame, currentMode, currentRotation]);

  // Apply current frame to all rotations in current mode
  const applyCurrentFrameToAllRotations = useCallback(() => {
    if (!currentFrame) return;

    setFormationData((prev) => {
      const newData = cloneFormationData(prev);
      const frameClone = JSON.parse(JSON.stringify(currentFrame));
      for (let r = 1; r <= 6; r++) {
        newData[currentMode][r as RotationNumber] = JSON.parse(JSON.stringify(frameClone));
      }
      return newData;
    });
    setHasUnsavedChanges(true);
  }, [currentFrame, currentMode]);

  // Validation
  const validationErrors = useMemo(() => validateFormation(formationData, true), [formationData]);
  const blockingErrors = useMemo(() => getBlockingErrors(formationData), [formationData]);
  const overlapWarnings = useMemo(() => getOverlapWarnings(formationData), [formationData]);
  const isValid = useMemo(() => isFormationValid(formationData), [formationData]);
  const hasBlockingErrors = blockingErrors.length > 0;

  // Draft management
  const saveDraft = useCallback(() => {
    if (typeof window === "undefined") return;

    const draft = {
      formationData,
      metadata,
      currentRotation,
      currentMode,
      liberoActive,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setHasDraft(true);
  }, [formationData, metadata, currentRotation, currentMode, liberoActive]);

  const loadDraft = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!draftJson) return false;

    try {
      const draft = JSON.parse(draftJson);
      if (draft.formationData) {
        setFormationData(draft.formationData);
      }
      if (draft.metadata) {
        setMetadataState(draft.metadata);
      }
      if (draft.currentRotation) {
        setCurrentRotation(draft.currentRotation);
      }
      if (draft.currentMode) {
        setCurrentMode(draft.currentMode);
      }
      if (typeof draft.liberoActive === "boolean") {
        setLiberoActive(draft.liberoActive);
      }
      setHasUnsavedChanges(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  }, []);

  // Auto-save draft periodically
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const interval = setInterval(() => {
      saveDraft();
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, saveDraft]);

  // Get formation data for saving
  const getFormationForSave = useCallback(() => {
    return {
      name: metadata.name.trim(),
      description: metadata.description.trim() || undefined,
      tags: metadata.tags.length > 0 ? metadata.tags : undefined,
      visibility: metadata.visibility,
      data: formationData,
    };
  }, [metadata, formationData]);

  return {
    // Editor state
    currentRotation,
    currentMode,
    liberoActive,
    selectedRole,
    isDragging,

    // Data
    formationData,
    metadata,
    currentFrame,

    // Dirty state
    hasUnsavedChanges,

    // Navigation
    setCurrentRotation,
    setCurrentMode,
    setLiberoActive,
    setSelectedRole,
    setIsDragging,
    nextRotation,
    prevRotation,

    // Position editing
    updatePlayerPosition,
    updateMovementArrow,
    removeMovementArrow,

    // Metadata editing
    setMetadata,
    setName,
    setDescription,
    setTags,
    setVisibility,

    // Reset operations
    resetCurrentRotation,
    resetAllRotations,

    // Frame operations
    copyCurrentFrame,
    pasteFrame,
    hasCopiedFrame: !!copiedFrame,
    applyCurrentFrameToAllRotations,

    // Validation
    validationErrors,
    blockingErrors,
    overlapWarnings,
    isValid,
    hasBlockingErrors,

    // Draft management
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,

    // Export
    getFormationForSave,
  };
};

// ============================================
// Helper: Create empty formation data
// ============================================

const createEmptyFormationData = (): FormationData => {
  const emptyFrame: RotationFrame = {
    roleSpots: {
      S: { x: 0.5, y: 0.5 },
      OPP: { x: 0.5, y: 0.5 },
      OH1: { x: 0.5, y: 0.5 },
      OH2: { x: 0.5, y: 0.5 },
      MB1: { x: 0.5, y: 0.5 },
      MB2: { x: 0.5, y: 0.5 },
      L: { x: 0.5, y: 0.5 },
    },
  };

  const data: FormationData = {
    serving: {} as Record<RotationNumber, RotationFrame>,
    receiving: {} as Record<RotationNumber, RotationFrame>,
  };

  for (let r = 1; r <= 6; r++) {
    data.serving[r as RotationNumber] = JSON.parse(JSON.stringify(emptyFrame));
    data.receiving[r as RotationNumber] = JSON.parse(JSON.stringify(emptyFrame));
  }

  return data;
};
