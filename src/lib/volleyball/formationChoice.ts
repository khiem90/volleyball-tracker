import type { FormationData, FormationType, UserFormation } from './types';
import { isBuiltinFormation } from './formations';
import { getTemplateById } from './templateFormations';

/** What the court draws for a formation id the picker hands back. */
export type ChosenFormation =
  | { source: 'builtin'; type: FormationType }
  | {
      source: 'template' | 'custom';
      name: string;
      description?: string;
      data: FormationData;
    };

/**
 * Resolve a built-in, template, or saved formation id. A saved formation
 * that has not loaded yet resolves to null.
 */
export const resolveFormation = (
  id: string,
  userFormations: UserFormation[]
): ChosenFormation | null => {
  if (isBuiltinFormation(id)) {
    return { source: 'builtin', type: id };
  }
  const template = getTemplateById(id);
  if (template) {
    return {
      source: 'template',
      name: template.name,
      description: template.description,
      data: template.data,
    };
  }
  const custom = userFormations.find((f) => f.id === id);
  if (custom) {
    return {
      source: 'custom',
      name: custom.name,
      description: custom.description,
      data: custom.data,
    };
  }
  return null;
};
