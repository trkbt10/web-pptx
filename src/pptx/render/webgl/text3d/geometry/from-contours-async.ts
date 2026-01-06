/**
 * @file Async geometry generation from text layout
 *
 * Uses Web Worker for glyph extraction.
 */

import * as THREE from "three";
import type { ContourPath } from "../../../glyph";
import { layoutTextAsync } from "../../../glyph";
import { getBevelConfig, createAsymmetricExtrudedGeometry, type AsymmetricBevelConfig } from "./bevel";
import type { Bevel3d } from "../../../../domain/three-d";

// =============================================================================
// Types
// =============================================================================

export type TextGeometryConfig = {
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fontStyle: "normal" | "italic";
  readonly extrusionDepth: number;
  /** Top bevel (bevelT) - front face bevel @see ECMA-376 bevelT */
  readonly bevelTop?: Bevel3d;
  /** Bottom bevel (bevelB) - back face bevel @see ECMA-376 bevelB */
  readonly bevelBottom?: Bevel3d;
  readonly letterSpacing?: number;
  readonly enableKerning?: boolean;
  readonly opticalKerning?: boolean;
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Create empty fallback geometry
 */
function createEmptyGeometry(): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(new THREE.Shape(), { depth: 0 });
}

/**
 * Generate extruded geometry from text (async - uses Web Worker)
 */
export async function createTextGeometryAsync(
  config: TextGeometryConfig,
): Promise<THREE.ExtrudeGeometry> {
  // Layout text using worker
  const layout = await layoutTextAsync(config.text, {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
    letterSpacing: config.letterSpacing,
    enableKerning: config.enableKerning,
    opticalKerning: config.opticalKerning,
  });

  if (!layout?.combinedPaths?.length) {
    if (config.text.trim().length === 0) {
      return createEmptyGeometry();
    }
    throw new Error("No contour paths were generated for non-empty text.");
  }

  // Convert paths to THREE.Shape
  const shapes = pathsToShapes(layout.combinedPaths);

  // Filter out any invalid shapes
  const validShapes = shapes.filter(
    (s): s is THREE.Shape => s != null && s instanceof THREE.Shape,
  );

  if (validShapes.length === 0) {
    throw new Error("No valid shapes were created from contour paths.");
  }

  // Get asymmetric bevel configuration (ECMA-376 bevelT/bevelB)
  const bevelConfig: AsymmetricBevelConfig = {
    top: getBevelConfig(config.bevelTop),
    bottom: getBevelConfig(config.bevelBottom),
  };

  // Create geometry with asymmetric bevel support
  const geometry = createAsymmetricExtrudedGeometry(
    validShapes,
    Math.max(config.extrusionDepth, 1),
    bevelConfig,
  ) as THREE.ExtrudeGeometry;

  // Normalize UV coordinates to 0-1 range for proper texture mapping
  normalizeUVs(geometry);

  return geometry;
}

/**
 * Normalize UV coordinates based on geometry position bounds.
 *
 * ECMA-376 specifies that gradient fills should cover the shape's bounding box.
 * ExtrudeGeometry creates UVs that don't match this requirement:
 * - Front/back faces: UVs based on shape coordinates (can be very large)
 * - Side faces: UVs based on path perimeter (different semantic)
 *
 * This function recalculates all UVs based on the X/Y position of each vertex,
 * normalized to the geometry's bounding box. This ensures:
 * 1. Gradient fills the entire bounding box (ECMA-376 compliant)
 * 2. Side faces show the correct part of the gradient based on their X position
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */
function normalizeUVs(geometry: THREE.BufferGeometry): void {
  const positionAttribute = geometry.getAttribute("position");
  const uvAttribute = geometry.getAttribute("uv");

  if (!positionAttribute || !uvAttribute) {
    return;
  }

  const posArray = positionAttribute.array as Float32Array;
  const uvArray = uvAttribute.array as Float32Array;

  // Find position bounds (X and Y only - Z is depth)
  // eslint-disable-next-line no-restricted-syntax -- Performance: iterating large arrays
  let minX = Infinity, maxX = -Infinity;
  // eslint-disable-next-line no-restricted-syntax -- Performance: iterating large arrays
  let minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < posArray.length; i += 3) {
    const x = posArray[i];
    const y = posArray[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  if (rangeX <= 0 || rangeY <= 0) {
    return;
  }

  // Recalculate UVs based on vertex X/Y positions
  // U = normalized X position (0 = left, 1 = right)
  // V = normalized Y position (0 = bottom, 1 = top)
  for (let i = 0; i < posArray.length / 3; i++) {
    const x = posArray[i * 3];
    const y = posArray[i * 3 + 1];

    // Normalize to 0-1 range based on bounding box
    uvArray[i * 2] = (x - minX) / rangeX;
    uvArray[i * 2 + 1] = (y - minY) / rangeY;
  }

  uvAttribute.needsUpdate = true;
}

// =============================================================================
// Path to Shape Conversion
// =============================================================================

type PathMeta = {
  readonly contour: ContourPath;
  readonly area: number;
};

export function pathsToShapes(paths: readonly ContourPath[]): THREE.Shape[] {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }

  const metas = paths
    .filter((path) => isValidContour(path))
    .map((contour) => ({
      contour,
      area: Math.abs(calculatePolygonArea(contour.points)),
    }));

  const parentIndices = metas.map((child, childIndex) => {
    const candidateParents = metas
      .map((parent, parentIndex) => ({ parent, parentIndex }))
      .filter(({ parentIndex }) => parentIndex !== childIndex)
      .filter(({ parent }) => parent.area > child.area)
      .filter(({ parent }) => isPathContainedIn(child.contour, parent.contour));

    if (candidateParents.length === 0) {
      return null;
    }

    const bestParent = candidateParents.reduce((currentBest, candidate) => {
      if (!currentBest) {
        return candidate;
      }
      return candidate.parent.area < currentBest.parent.area ? candidate : currentBest;
    }, null as { parent: PathMeta; parentIndex: number } | null);

    return bestParent?.parentIndex ?? null;
  });

  const shapes = metas.reduce<THREE.Shape[]>((acc, meta, index) => {
    if (parentIndices[index] !== null) {
      return acc;
    }

    const shape = new THREE.Shape();
    if (!applyContourPoints(shape, meta.contour)) {
      return acc;
    }

    acc.push(shape);
    return acc;
  }, []);

  const shapeIndexByMetaIndex = parentIndices.reduce<Map<number, number>>((acc, parentIndex, metaIndex) => {
    if (parentIndex === null) {
      acc.set(metaIndex, acc.size);
    }
    return acc;
  }, new Map());

  parentIndices.forEach((parentIndex, metaIndex) => {
    if (parentIndex === null) {
      return;
    }
    const shapeIndex = shapeIndexByMetaIndex.get(parentIndex);
    if (shapeIndex === undefined) {
      return;
    }
    const hole = createHolePath(metas[metaIndex].contour);
    if (hole) {
      shapes[shapeIndex].holes.push(hole);
    }
  });

  return shapes;
}

function isValidContour(contour: ContourPath): boolean {
  return Array.isArray(contour?.points) && contour.points.length >= 3;
}

function calculatePolygonArea(points: readonly { x: number; y: number }[]): number {
  const total = points.reduce((acc, point, index) => {
    const next = points[(index + 1) % points.length];
    return acc + point.x * next.y - next.x * point.y;
  }, 0);
  return total / 2;
}

function applyContourPoints(
  target: THREE.Path | THREE.Shape,
  contourPath: ContourPath,
): boolean {
  const { points } = contourPath;
  if (!points || !Array.isArray(points) || points.length < 3) {
    return false;
  }

  const first = points[0];
  if (typeof first?.x !== "number" || typeof first?.y !== "number") {
    return false;
  }
  target.moveTo(first.x, -first.y);

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (typeof pt?.x !== "number" || typeof pt?.y !== "number") {
      continue;
    }
    target.lineTo(pt.x, -pt.y);
  }

  target.closePath();
  return true;
}

function createHolePath(contourPath: ContourPath): THREE.Path | null {
  const path = new THREE.Path();
  return applyContourPoints(path, contourPath) ? path : null;
}

function isPathContainedIn(hole: ContourPath, outer: ContourPath): boolean {
  if (!hole?.points?.length || !outer?.points || outer.points.length < 3) {
    return false;
  }
  return isPointInPolygon(hole.points[0], outer.points);
}

function isPointInPolygon(
  point: { x: number; y: number },
  polygon: readonly { x: number; y: number }[],
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

// =============================================================================
// Geometry Merging
// =============================================================================

export function mergeExtrudeGeometries(
  geomA: THREE.ExtrudeGeometry,
  geomB: THREE.ExtrudeGeometry,
): THREE.ExtrudeGeometry {
  const posA = geomA.attributes.position;
  const posB = geomB.attributes.position;
  const normalA = geomA.attributes.normal;
  const normalB = geomB.attributes.normal;
  const uvA = geomA.attributes.uv;
  const uvB = geomB.attributes.uv;

  const mergedPositions = new Float32Array(posA.count * 3 + posB.count * 3);
  mergedPositions.set(posA.array as Float32Array, 0);
  mergedPositions.set(posB.array as Float32Array, posA.count * 3);

  const mergedNormals = new Float32Array(normalA.count * 3 + normalB.count * 3);
  mergedNormals.set(normalA.array as Float32Array, 0);
  mergedNormals.set(normalB.array as Float32Array, normalA.count * 3);

  const mergedUvs = uvA && uvB
    ? new Float32Array(uvA.count * 2 + uvB.count * 2)
    : null;

  if (mergedUvs && uvA && uvB) {
    mergedUvs.set(uvA.array as Float32Array, 0);
    mergedUvs.set(uvB.array as Float32Array, uvA.count * 2);
  }

  const indexA = geomA.index;
  const indexB = geomB.index;
  let mergedIndices: number[] = [];

  if (indexA && indexB) {
    mergedIndices = [...(indexA.array as Uint16Array | Uint32Array)];
    for (let i = 0; i < indexB.count; i++) {
      mergedIndices.push((indexB.array as Uint16Array | Uint32Array)[i] + posA.count);
    }
  }

  const merged = new THREE.ExtrudeGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPositions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(mergedNormals, 3));
  if (mergedUvs) {
    merged.setAttribute("uv", new THREE.BufferAttribute(mergedUvs, 2));
  } else {
    merged.deleteAttribute("uv");
  }
  if (mergedIndices.length > 0) {
    merged.setIndex(mergedIndices);
  }

  geomB.dispose();
  return merged;
}

// =============================================================================
// Utility
// =============================================================================

export function scaleGeometryToFit(
  geometry: THREE.BufferGeometry,
  maxWidth: number,
  maxHeight: number,
): void {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return;

  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  const scaleX = size.x > 0 ? maxWidth / size.x : 1;
  const scaleY = size.y > 0 ? maxHeight / size.y : 1;
  const scale = Math.min(scaleX, scaleY, 1);

  if (scale < 1) {
    geometry.scale(scale, scale, scale);
  }
}
