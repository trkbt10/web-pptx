/**
 * @file Shape bounds
 *
 * Bounding box and geometry operations for shapes.
 */

import type { Shape } from "../../../pptx/domain";
import type { Bounds } from "../../../pptx/domain/types";
import { px } from "../../../pptx/domain/types";
import { getShapeTransform } from "../../utils";

/**
 * Get bounds from shape transform
 */
export function getShapeBounds(shape: Shape): Bounds | undefined {
  const transform = getShapeTransform(shape);
  if (!transform) {
    return undefined;
  }
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

/**
 * Calculate combined bounding box for multiple shapes
 */
export function getCombinedBounds(shapes: readonly Shape[]): Bounds | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasAny = false;

  for (const shape of shapes) {
    const bounds = getShapeBounds(shape);
    if (bounds) {
      hasAny = true;
      minX = Math.min(minX, bounds.x as number);
      minY = Math.min(minY, bounds.y as number);
      maxX = Math.max(maxX, (bounds.x as number) + (bounds.width as number));
      maxY = Math.max(maxY, (bounds.y as number) + (bounds.height as number));
    }
  }

  if (!hasAny) {
    return undefined;
  }

  return {
    x: px(minX),
    y: px(minY),
    width: px(maxX - minX),
    height: px(maxY - minY),
  };
}
