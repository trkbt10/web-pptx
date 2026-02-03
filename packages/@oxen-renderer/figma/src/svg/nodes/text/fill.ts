/**
 * @file Text fill color handling
 */

import type { FigPaint, FigColor } from "@oxen/fig/types";
import { figColorToHex, getPaintType, isPlaceholderColor } from "../../fill";
import type { FillColorResult } from "./types";

/**
 * Default fill color for text (black)
 */
const DEFAULT_FILL: FillColorResult = { color: "#000000", opacity: 1 };

/**
 * Get fill color and opacity from paints for text nodes
 *
 * For text, we only support solid colors. Gradients and images
 * are not applied to text fills.
 *
 * @param paints - Array of fill paints from the node
 * @returns Fill color (hex) and opacity
 */
export function getFillColorAndOpacity(
  paints: readonly FigPaint[] | undefined
): FillColorResult {
  if (!paints || paints.length === 0) {
    return DEFAULT_FILL;
  }

  const firstPaint = paints.find((p) => p.visible !== false);
  if (!firstPaint) {
    return DEFAULT_FILL;
  }

  if (getPaintType(firstPaint) !== "SOLID") {
    return DEFAULT_FILL;
  }

  const solidPaint = firstPaint as FigPaint & { color: FigColor };

  // Check for placeholder color (unresolved external style reference)
  // Figma uses pure red (r:1, g:0, b:0) as a placeholder
  if (isPlaceholderColor(solidPaint.color)) {
    return DEFAULT_FILL;
  }

  return {
    color: figColorToHex(solidPaint.color),
    opacity: firstPaint.opacity ?? 1,
  };
}
