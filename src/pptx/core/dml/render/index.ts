/**
 * @file DrawingML render functions
 *
 * Domain object to output conversion for DrawingML color processing.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */

// Types
export type { BackgroundFill, GradientData, GradientStop, ImageFillMode } from "./types";

// Color resolution
export { resolveColor } from "./color";

// Background rendering
export { getSlideBackgroundFill, getBackgroundFillData } from "./background";
