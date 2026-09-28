/**
 * Formation links, the pure part: how a shared formation's public link is
 * spelled, and how the rotation designer is told which formation to load.
 * Nothing in here touches the database or the browser.
 */
import type { UserFormation } from './types';

const DESIGNER_PATH = '/tools/volleyball-rotations';
const FORMATION_PARAM = 'formation';

/** The formation's public link on this origin while it is shared, else null. */
export const formationShareLink = (origin: string, formation: UserFormation): string | null =>
  formation.visibility === 'unlisted' && formation.shareId
    ? `${origin}${DESIGNER_PATH}/shared/${formation.shareId}`
    : null;

/** The rotation designer with this formation loaded onto the court. */
export const formationDesignerHref = (formationId: string): string =>
  `${DESIGNER_PATH}?${FORMATION_PARAM}=${encodeURIComponent(formationId)}`;

/** The formation the designer's page query asks for, if any. */
export const formationIdIn = (params: Pick<URLSearchParams, 'get'>): string | null =>
  params.get(FORMATION_PARAM) || null;
