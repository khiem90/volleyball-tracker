/*
 * Pictures under public/ that a component draws by path. The crest is in
 * public/brand and everything else is in public/assets. The icon sprite is
 * there too, at public/assets/icons/sprite.svg, and only the Icon component
 * spells its path.
 */

/**
 * The app's crest, a square. public/brand also holds crest-small.svg, the cut
 * for 32px and under, and crest-maskable.svg, the full green square for a
 * launcher's mask. scripts/generate-icons.mjs draws every icon from the three.
 */
export const CREST_SRC = "/brand/crest.svg";

/** Google's own "G", in Google's colors. */
export const GOOGLE_MARK_SRC = "/assets/auth/google-g.svg";
