/**
 * @file Vector node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { path, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";

// =============================================================================
// Vector Path Types
// =============================================================================

/**
 * Figma vector path
 */
type FigVectorPath = {
  readonly windingRule?: "NONZERO" | "EVENODD" | "ODD";
  readonly data?: string;
};

// =============================================================================
// Vector Node
// =============================================================================

/**
 * Extract vector properties from a Figma node
 */
function extractVectorProps(node: FigNode): {
  transform: FigMatrix | undefined;
  vectorPaths: readonly FigVectorPath[] | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    transform: nodeData.transform as FigMatrix | undefined,
    vectorPaths: nodeData.vectorPaths as readonly FigVectorPath[] | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Render a VECTOR node to SVG
 */
export function renderVectorNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { transform, vectorPaths, fillPaints, strokePaints, strokeWeight, opacity } =
    extractVectorProps(node);

  if (!vectorPaths || vectorPaths.length === 0) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Single path
  if (vectorPaths.length === 1) {
    const vectorPath = vectorPaths[0];
    if (!vectorPath.data) {
      return EMPTY_SVG;
    }

    return path({
      d: vectorPath.data,
      "fill-rule": mapWindingRule(vectorPath.windingRule),
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
      ...fillAttrs,
      ...strokeAttrs,
    });
  }

  // Multiple paths - wrap in group
  const paths = vectorPaths
    .filter((vp) => {
      return vp.data;
    })
    .map((vectorPath) =>
      path({
        d: vectorPath.data!,
        "fill-rule": mapWindingRule(vectorPath.windingRule),
        ...fillAttrs,
        ...strokeAttrs,
      })
    );

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...paths
  );
}

/**
 * Map Figma winding rule to SVG fill-rule
 */
function mapWindingRule(
  rule: "NONZERO" | "EVENODD" | "ODD" | undefined
): "nonzero" | "evenodd" | undefined {
  switch (rule) {
    case "NONZERO":
      return "nonzero";
    case "EVENODD":
    case "ODD":
      return "evenodd";
    default:
      return undefined;
  }
}
