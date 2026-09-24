/**
 * Generate a unique ID for undo entries
 */
export const generateUndoId = (): string => {
  return `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};
