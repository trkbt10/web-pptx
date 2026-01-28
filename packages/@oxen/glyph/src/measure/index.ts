/**
 * @file Text measurement module
 *
 * Provides text measurement using Canvas API with font-metrics fallback.
 */

// Units
export type { Pixels, Points } from "./units";
export { px, pt, PT_TO_PX, PX_TO_PT, pointsToPixels, pixelsToPoints } from "./units";

// Measurer
export type { CharWidthResult, DetailedMeasurement, TextMeasurer } from "./measurer";
export {
  calculateCharWidth,
  measureTextWidth,
  estimateTextWidthFallback,
  measureTextDetailed,
  createTextMeasurer,
} from "./measurer";
