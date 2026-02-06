import { COURT_SVG } from "./constants";

const { WIDTH, HEIGHT, PADDING } = COURT_SVG;

/** Convert normalized coordinates (0-1) to SVG coordinates */
export const toSvgCoords = (x: number, y: number) => ({
  x: PADDING + x * WIDTH,
  y: PADDING + (1 - y) * HEIGHT, // Flip Y axis (0 at bottom)
});

/** Convert SVG coordinates back to normalized coordinates (0-1) */
export const fromSvgCoords = (svgX: number, svgY: number) => ({
  x: (svgX - PADDING) / WIDTH,
  y: 1 - (svgY - PADDING) / HEIGHT, // Flip Y axis back
});
