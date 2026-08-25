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
import { getBackRowMiddle } from "@/lib/volleyball/rotations";
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
  /** When the draft was last written — makes the 30s autosave visible. */
  draftSavedAt: number | null;

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
  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem(DRAFT_STORAGE_KEY);
    }
    return false;
  });

  /* Lazily initialised: `useRef(getInitialData())` would run a full deep
     clone on every render and discard it — 60 clones/s under a drag. */
  const initialDataRef = useRef<FormationData | null>(null);
  if (initialDataRef.current === null) {
    initialDataRef.current = getInitialData();
  }
  const initialData0 = initialDataRef.current;

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

  /* Replace ONE frame, sharing every other frame by reference — the eleven
     untouched frames must keep their identity so memoised consumers (and the
     four validation passes) do not re-run per drag frame. */
  const writeFrame = useCallback(
    (mutate: (frame: RotationFrame) => RotationFrame) => {
      setFormationData((prev) => {
        const frame = prev[currentMode]?.[currentRotation];
        if (!frame) return prev;
        return {
          ...prev,
          [currentMode]: { ...prev[currentMode], [currentRotation]: mutate(frame) },
        };
      });
      setHasUnsavedChanges(true);
    },
    [currentMode, currentRotation]
  );

  // Update player position
  const updatePlayerPosition = useCallback(
    (role: PlayerRole, position: CourtPosition) => {
      writeFrame((frame) => ({
        ...frame,
        roleSpots: { ...frame.roleSpots, [role]: position },
      }));
    },
    [writeFrame]
  );

  // Update movement arrow
  const updateMovementArrow = useCallback(
    (role: PlayerRole, from: CourtPosition, to: CourtPosition) => {
      writeFrame((frame) => ({
        ...frame,
        movementArrows: { ...frame.movementArrows, [role]: { from, to } },
      }));
    },
    [writeFrame]
  );

  // Remove movement arrow
  const removeMovementArrow = useCallback(
    (role: PlayerRole) => {
      writeFrame((frame) => {
        if (!frame.movementArrows) return frame;
        const next = { ...frame.movementArrows };
        delete next[role];
        return { ...frame, movementArrows: next };
      });
    },
    [writeFrame]
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
    const initialFrame = initialData0[currentMode]?.[currentRotation];
    if (!initialFrame) return;
    writeFrame(() => JSON.parse(JSON.stringify(initialFrame)) as RotationFrame);
  }, [currentMode, currentRotation, initialData0, writeFrame]);

  // Reset all rotations
  const resetAllRotations = useCallback(() => {
    setFormationData(cloneFormationData(initialData0));
    setHasUnsavedChanges(true);
  }, [initialData0]);

  // Copy/paste frame
  const copyCurrentFrame = useCallback(() => {
    if (currentFrame) {
      setCopiedFrame(JSON.parse(JSON.stringify(currentFrame)));
    }
  }, [currentFrame]);

  const pasteFrame = useCallback(() => {
    if (!copiedFrame) return;
    writeFrame(() => JSON.parse(JSON.stringify(copiedFrame)) as RotationFrame);
  }, [copiedFrame, writeFrame]);

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
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  const saveDraft = useCallback(() => {
    if (typeof window === "undefined") return;

    const savedAt = Date.now();
    const draft = {
      formationData,
      metadata,
      currentRotation,
      currentMode,
      liberoActive,
      savedAt,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setHasDraft(true);
      setDraftSavedAt(savedAt);
    } catch {
      /* Quota or a privacy mode that refuses storage. The draft is a
         convenience; losing it must never take the editor down with it. */
    }
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
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* see saveDraft */
    }
    setHasDraft(false);
    setDraftSavedAt(null);
  }, []);

  // Auto-save draft periodically
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const interval = setInterval(() => {
      saveDraft();
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, saveDraft]);

  /* Materialise the libero spot on save: a formation built from a template
     that never placed `L` has no `L` spot at all. The read-side
     `roleSpots.L || roleSpots[backRowMB]` fallback stays for documents saved
     before this shipped. */
  const getFormationForSave = useCallback(() => {
    const materialised: FormationData = { serving: {}, receiving: {} } as FormationData;
    (["serving", "receiving"] as const).forEach((frameMode) => {
      for (let r = 1; r <= 6; r += 1) {
        const rotationKey = r as RotationNumber;
        const frame = formationData[frameMode]?.[rotationKey];
        if (!frame) continue;
        if (frame.roleSpots?.L) {
          materialised[frameMode][rotationKey] = frame;
          continue;
        }
        const fallback = frame.roleSpots?.[getBackRowMiddle(rotationKey)];
        materialised[frameMode][rotationKey] = fallback
          ? { ...frame, roleSpots: { ...frame.roleSpots, L: { ...fallback } } }
          : frame;
      }
    });

    return {
      name: metadata.name.trim(),
      description: metadata.description.trim() || undefined,
      tags: metadata.tags.length > 0 ? metadata.tags : undefined,
      visibility: metadata.visibility,
      data: materialised,
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
    draftSavedAt,

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
