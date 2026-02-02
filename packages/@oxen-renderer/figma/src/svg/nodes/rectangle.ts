/**
 * @file Rectangle node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { rect, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";

// =============================================================================
// Rectangle Node
// =============================================================================

/**
 * Extract rectangle properties from a Figma node
 */
function extractRectProps(node: FigNode): {
  size: FigVector;
  transform: FigMatrix | undefined;
  cornerRadius: number | undefined;
  cornerRadii: readonly number[] | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    size: (nodeData.size as FigVector) ?? { x: 100, y: 100 },
    transform: nodeData.transform as FigMatrix | undefined,
    cornerRadius: nodeData.cornerRadius as number | undefined,
    cornerRadii: nodeData.rectangleCornerRadii as readonly number[] | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Calculate corner radius from corner radii array or single value
 */
function calculateCornerRadius(
  cornerRadii: readonly number[] | undefined,
  cornerRadius: number | undefined
): { rx: number | undefined; ry: number | undefined } {
  if (cornerRadii && cornerRadii.length === 4) {
    // All corners same? Use rx/ry
    const allSame =
      cornerRadii[0] === cornerRadii[1] &&
      cornerRadii[1] === cornerRadii[2] &&
      cornerRadii[2] === cornerRadii[3];
    if (allSame) {
      return { rx: cornerRadii[0], ry: cornerRadii[0] };
    }
    // Different corners - would need path, use average for now
    const avg = (cornerRadii[0] + cornerRadii[1] + cornerRadii[2] + cornerRadii[3]) / 4;
    return { rx: avg, ry: avg };
  }
  if (cornerRadius) {
    return { rx: cornerRadius, ry: cornerRadius };
  }
  return { rx: undefined, ry: undefined };
}

/**
 * Get positive radius or undefined
 */
function getPositiveRadius(value: number | undefined): number | undefined {
  if (value && value > 0) {
    return value;
  }
  return undefined;
}

/**
 * Render a RECTANGLE node to SVG
 */
export function renderRectangleNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { size, transform, cornerRadius, cornerRadii, fillPaints, strokePaints, strokeWeight, opacity } =
    extractRectProps(node);

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Determine corner radius
  const { rx, ry } = calculateCornerRadius(cornerRadii, cornerRadius);

  return rect({
    x: 0,
    y: 0,
    width: size.x,
    height: size.y,
    rx: getPositiveRadius(rx),
    ry: getPositiveRadius(ry),
    transform: transformStr || undefined,
    opacity: opacity < 1 ? opacity : undefined,
    ...fillAttrs,
    ...strokeAttrs,
  });
}
