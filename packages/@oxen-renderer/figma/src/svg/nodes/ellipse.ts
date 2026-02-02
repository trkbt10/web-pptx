/**
 * @file Ellipse node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { ellipse, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";

// =============================================================================
// Ellipse Node
// =============================================================================

/**
 * Extract ellipse properties from a Figma node
 */
function extractEllipseProps(node: FigNode): {
  size: FigVector;
  transform: FigMatrix | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    size: (nodeData.size as FigVector) ?? { x: 100, y: 100 },
    transform: nodeData.transform as FigMatrix | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Render an ELLIPSE node to SVG
 */
export function renderEllipseNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { size, transform, fillPaints, strokePaints, strokeWeight, opacity } =
    extractEllipseProps(node);

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Center of ellipse
  const cx = size.x / 2;
  const cy = size.y / 2;

  return ellipse({
    cx,
    cy,
    rx: cx,
    ry: cy,
    transform: transformStr || undefined,
    opacity: opacity < 1 ? opacity : undefined,
    ...fillAttrs,
    ...strokeAttrs,
  });
}
