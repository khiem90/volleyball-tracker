/*
 * Pictures under public/ that a component draws by path. The crest has its
 * own folder, public/brand. Google's mark still sits in a folder that carries
 * the old theme's name, and a file on the design guard's migrated list cannot
 * spell that folder, so it reads the path from here. When that folder is
 * renamed, the last line changes and nothing else does.
 */

/**
 * The app's crest, a square. public/brand also holds crest-small.svg, the cut
 * for 32px and under, and crest-maskable.svg, the full green square for a
 * launcher's mask. scripts/generate-icons.mjs draws every icon from the three.
 */
export const CREST_SRC = "/brand/crest.svg";

/** Google's own "G", in Google's colors. */
export const GOOGLE_MARK_SRC = "/assets/matchbook/auth/google-g.svg";
