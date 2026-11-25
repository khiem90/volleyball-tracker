/* WCAG 2 contrast between two colors written as "#rrggbb". */

/** One sRGB channel, 0 to 255, as linear light. */
const linear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** How bright a color is to the eye, from 0 for black to 1 for white. */
const luminance = (hex: string): number => {
  const rgb = parseInt(hex.slice(1), 16);
  return (
    0.2126 * linear(rgb >> 16) +
    0.7152 * linear((rgb >> 8) & 0xff) +
    0.0722 * linear(rgb & 0xff)
  );
};

/**
 * The contrast ratio of two colors, from 1 for a color on itself to 21 for
 * black on white. The order of the two does not matter. Text needs 4.5 and a
 * graphic needs 3.
 */
export const contrastRatio = (a: string, b: string): number => {
  const [darker, lighter] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (lighter + 0.05) / (darker + 0.05);
};
