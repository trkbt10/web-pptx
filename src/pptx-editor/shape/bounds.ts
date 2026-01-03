/**
 * @file Shape bounds
 *
 * Bounding box and geometry operations for shapes.
 */

import type { Shape } from "../../pptx/domain";
import type { Bounds, ShapeId } from "../../pptx/domain/types";
import { px } from "../../pptx/domain/types";
import { getShapeTransform } from "./transform";
import { findShapeById } from "./query";

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

/**
 * Collect bounds for specified shape IDs
 * Returns a Map from ShapeId to Bounds for shapes that have valid bounds.
 */
export function collectBoundsForIds(
  shapes: readonly Shape[],
  ids: readonly ShapeId[]
): Map<ShapeId, Bounds> {
  const result = new Map<ShapeId, Bounds>();
  for (const id of ids) {
    const shape = findShapeById(shapes, id);
    if (shape) {
      const bounds = getShapeBounds(shape);
      if (bounds) {
        result.set(id, bounds);
      }
    }
  }
  return result;
}

/**
 * Calculate combined center point for shapes
 */
export function getCombinedCenter(
  boundsMap: Map<ShapeId, Bounds>
): { centerX: number; centerY: number } | undefined {
  if (boundsMap.size === 0) {
    return undefined;
  }

  let totalCenterX = 0;
  let totalCenterY = 0;

  for (const bounds of boundsMap.values()) {
    totalCenterX += (bounds.x as number) + (bounds.width as number) / 2;
    totalCenterY += (bounds.y as number) + (bounds.height as number) / 2;
  }

  return {
    centerX: totalCenterX / boundsMap.size,
    centerY: totalCenterY / boundsMap.size,
  };
}
