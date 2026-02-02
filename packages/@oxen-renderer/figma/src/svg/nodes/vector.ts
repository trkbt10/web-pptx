/**
 * @file Vector node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigStrokeWeight,
} from "@oxen/fig/types";
import { decodeBlobToSvgPath, type FigBlob } from "@oxen/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { path, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";

// =============================================================================
// Vector Path Types
// =============================================================================

/**
 * Figma vector path (from vectorPaths property)
 */
type FigVectorPath = {
  readonly windingRule?: "NONZERO" | "EVENODD" | "ODD";
  readonly data?: string;
};

/**
 * Figma fill geometry (references commandsBlob)
 */
type FigFillGeometry = {
  readonly windingRule?: { value: number; name: string } | string;
  readonly commandsBlob?: number;
  readonly styleID?: number;
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
  fillGeometry: readonly FigFillGeometry[] | undefined;
  strokeGeometry: readonly FigFillGeometry[] | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    transform: nodeData.transform as FigMatrix | undefined,
    vectorPaths: nodeData.vectorPaths as readonly FigVectorPath[] | undefined,
    fillGeometry: nodeData.fillGeometry as readonly FigFillGeometry[] | undefined,
    strokeGeometry: nodeData.strokeGeometry as readonly FigFillGeometry[] | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Get winding rule from FigFillGeometry
 */
function getGeometryWindingRule(geom: FigFillGeometry): "NONZERO" | "EVENODD" | "ODD" | undefined {
  if (!geom.windingRule) {
    return undefined;
  }
  if (typeof geom.windingRule === "string") {
    return geom.windingRule as "NONZERO" | "EVENODD" | "ODD";
  }
  return geom.windingRule.name as "NONZERO" | "EVENODD" | "ODD";
}

type WindingRule = "NONZERO" | "EVENODD" | "ODD";
type PathData = { data: string; windingRule?: WindingRule };

/**
 * Decode path data from fillGeometry using blobs
 */
function decodePathsFromGeometry(
  fillGeometry: readonly FigFillGeometry[],
  blobs: readonly FigBlob[]
): PathData[] {
  const paths: PathData[] = [];

  for (const geom of fillGeometry) {
    if (geom.commandsBlob !== undefined && geom.commandsBlob < blobs.length) {
      const blob = blobs[geom.commandsBlob];
      if (blob) {
        const data = decodeBlobToSvgPath(blob);
        if (data) {
          paths.push({
            data,
            windingRule: getGeometryWindingRule(geom),
          });
        }
      }
    }
  }

  return paths;
}

type PathSources = {
  readonly vectorPaths: readonly FigVectorPath[] | undefined;
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
  readonly blobs: readonly FigBlob[];
};

/**
 * Get paths to render from various sources
 */
function getPathsToRender(sources: PathSources): PathData[] {
  const { vectorPaths, fillGeometry, strokeGeometry, blobs } = sources;

  // Try vectorPaths first (if available)
  if (vectorPaths && vectorPaths.length > 0) {
    const paths = vectorPaths
      .filter((vp) => vp.data)
      .map((vp) => ({ data: vp.data!, windingRule: vp.windingRule }));
    if (paths.length > 0) {
      return paths;
    }
  }

  // Try fillGeometry with blob decoding
  if (fillGeometry && fillGeometry.length > 0) {
    const paths = decodePathsFromGeometry(fillGeometry, blobs);
    if (paths.length > 0) {
      return paths;
    }
  }

  // For LINE nodes, use strokeGeometry instead of fillGeometry
  if (strokeGeometry && strokeGeometry.length > 0) {
    return decodePathsFromGeometry(strokeGeometry, blobs);
  }

  return [];
}

/**
 * Render a VECTOR node to SVG
 */
export function renderVectorNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { transform, vectorPaths, fillGeometry, strokeGeometry, fillPaints, strokePaints, strokeWeight, opacity } =
    extractVectorProps(node);

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Try vectorPaths first (if available), then fillGeometry, then strokeGeometry
  const pathsToRender = getPathsToRender({ vectorPaths, fillGeometry, strokeGeometry, blobs: ctx.blobs });

  if (pathsToRender.length === 0) {
    return EMPTY_SVG;
  }

  // Single path
  if (pathsToRender.length === 1) {
    const { data, windingRule } = pathsToRender[0];
    return path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
      ...fillAttrs,
      ...strokeAttrs,
    });
  }

  // Multiple paths - wrap in group
  const pathElements = pathsToRender.map(({ data, windingRule }) =>
    path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      ...fillAttrs,
      ...strokeAttrs,
    })
  );

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...pathElements
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
