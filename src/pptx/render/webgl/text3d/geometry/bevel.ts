/**
 * @file 3D Text Geometry for WebGL rendering
 *
 * Converts text to 3D geometry with bevel and extrusion.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import * as THREE from "three";
import type { Shape3d, Bevel3d, BevelPresetType, Pixels } from "../../../../domain/index";

// =============================================================================
// Geometry Configuration Types
// =============================================================================

export type TextGeometryConfig = {
  /** Text content */
  readonly text: string;
  /** Font size in pixels */
  readonly fontSize: number;
  /** Font family */
  readonly fontFamily: string;
  /** Font weight */
  readonly fontWeight: number;
  /** Font style */
  readonly fontStyle: "normal" | "italic";
  /** Extrusion depth in pixels */
  readonly extrusionDepth: number;
  /** Bevel configuration */
  readonly bevel: BevelConfig | undefined;
};

export type BevelConfig = {
  /** Bevel thickness */
  readonly thickness: number;
  /** Bevel size */
  readonly size: number;
  /** Bevel segments (smoothness) */
  readonly segments: number;
};

// =============================================================================
// Bevel Preset Configurations
// =============================================================================

/**
 * Get bevel configuration from ECMA-376 preset
 *
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */
export function getBevelConfig(bevel: Bevel3d | undefined): BevelConfig | undefined {
  if (!bevel) {return undefined;}

  const width = bevel.width as number;
  const height = bevel.height as number;
  // Keep bevel in same pixel units as shape paths and extrusion depth
  // The scaleGroupToFit in core.ts handles final sizing
  const baseSize = Math.min(width, height);

  switch (bevel.preset) {
    case "angle":
      return { thickness: baseSize * 0.5, size: baseSize, segments: 1 };

    case "artDeco":
      return { thickness: baseSize * 0.8, size: baseSize * 0.6, segments: 3 };

    case "circle":
      return { thickness: baseSize, size: baseSize, segments: 8 };

    case "convex":
      return { thickness: baseSize * 1.2, size: baseSize * 0.8, segments: 6 };

    case "coolSlant":
      return { thickness: baseSize * 0.4, size: baseSize * 1.2, segments: 2 };

    case "cross":
      return { thickness: baseSize * 0.6, size: baseSize * 0.6, segments: 2 };

    case "divot":
      return { thickness: baseSize * 0.3, size: baseSize * 0.5, segments: 4 };

    case "hardEdge":
      return { thickness: baseSize * 0.2, size: baseSize * 0.3, segments: 1 };

    case "relaxedInset":
      return { thickness: baseSize * 0.7, size: baseSize * 0.9, segments: 4 };

    case "riblet":
      return { thickness: baseSize * 0.4, size: baseSize * 0.4, segments: 2 };

    case "slope":
      return { thickness: baseSize * 0.6, size: baseSize * 1.0, segments: 3 };

    case "softRound":
      return { thickness: baseSize * 0.9, size: baseSize * 0.9, segments: 6 };

    default:
      return { thickness: baseSize * 0.5, size: baseSize * 0.5, segments: 3 };
  }
}

/**
 * Get asymmetric bevel configuration from Shape3d.
 *
 * Returns separate top (front) and bottom (back) bevel configs
 * per ECMA-376 bevelT/bevelB specification.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export function getAsymmetricBevelConfig(shape3d: Shape3d | undefined): AsymmetricBevelConfig {
  if (!shape3d) {
    return { top: undefined, bottom: undefined };
  }

  return {
    top: getBevelConfig(shape3d.bevelTop),
    bottom: getBevelConfig(shape3d.bevelBottom),
  };
}

// =============================================================================
// Text to Shape Conversion
// =============================================================================

/**
 * Convert text to 2D shapes using canvas
 *
 * This creates vector paths from text that can be extruded to 3D
 */
export function textToShapes(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  fontStyle: "normal" | "italic",
): THREE.Shape[] {
  // Create offscreen canvas for text measurement
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [createFallbackShape(fontSize)];
  }

  // Set font
  const fontStyleStr = fontStyle === "italic" ? "italic " : "";
  const fontWeightStr = fontWeight >= 700 ? "bold " : "";
  ctx.font = `${fontStyleStr}${fontWeightStr}${fontSize}px ${fontFamily}`;

  // Measure text
  const metrics = ctx.measureText(text);
  const width = metrics.width;
  const height = fontSize;

  // For now, create simplified rectangular shapes per character
  // A full implementation would use font parsing library
  return createTextShapes(text, fontSize, fontFamily, fontWeight, fontStyle);
}

/**
 * Create simplified text shapes
 *
 * This creates approximate shapes based on character outlines
 */
function createTextShapes(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  fontStyle: "normal" | "italic",
): THREE.Shape[] {
  const shapes: THREE.Shape[] = [];
  const scale = fontSize / 100; // Normalize to 100pt base
  let xOffset = 0;

  for (const char of text) {
    if (char === " ") {
      xOffset += fontSize * 0.3;
      continue;
    }

    const charShape = createCharacterShape(char, scale, xOffset, fontWeight);
    if (charShape) {
      shapes.push(charShape);
    }

    // Approximate character width (simplified)
    xOffset += fontSize * getCharacterWidth(char);
  }

  return shapes;
}

/**
 * Create a shape for a single character
 *
 * This creates a stylized approximation of character shapes
 */
function createCharacterShape(
  char: string,
  scale: number,
  xOffset: number,
  fontWeight: number,
): THREE.Shape | null {
  const shape = new THREE.Shape();
  const baseWidth = 60 * scale;
  const baseHeight = 100 * scale;
  const strokeWidth = fontWeight >= 700 ? 12 * scale : 8 * scale;

  // Create character-specific shapes
  const code = char.charCodeAt(0);

  if (code >= 65 && code <= 90) {
    // Uppercase A-Z
    return createUppercaseShape(char, scale, xOffset, strokeWidth);
  } else if (code >= 97 && code <= 122) {
    // Lowercase a-z
    return createLowercaseShape(char, scale, xOffset, strokeWidth);
  } else if (code >= 48 && code <= 57) {
    // Numbers 0-9
    return createNumberShape(char, scale, xOffset, strokeWidth);
  }

  // Default: simple rectangle
  shape.moveTo(xOffset, 0);
  shape.lineTo(xOffset + baseWidth, 0);
  shape.lineTo(xOffset + baseWidth, baseHeight);
  shape.lineTo(xOffset, baseHeight);
  shape.closePath();

  return shape;
}

/**
 * Create shape for uppercase letters
 */
function createUppercaseShape(
  char: string,
  scale: number,
  xOffset: number,
  strokeWidth: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const h = 100 * scale; // Height
  const w = 60 * scale; // Width
  const s = strokeWidth; // Stroke width
  const x = xOffset;

  switch (char) {
    case "A":
      // Triangular A shape
      shape.moveTo(x + w / 2, h);
      shape.lineTo(x + w, 0);
      shape.lineTo(x + w - s, 0);
      shape.lineTo(x + w / 2, h - s * 2);
      shape.lineTo(x + s, 0);
      shape.lineTo(x, 0);
      shape.closePath();
      // Crossbar hole
      const hole = new THREE.Path();
      hole.moveTo(x + w * 0.3, h * 0.35);
      hole.lineTo(x + w * 0.7, h * 0.35);
      hole.lineTo(x + w * 0.6, h * 0.25);
      hole.lineTo(x + w * 0.4, h * 0.25);
      hole.closePath();
      shape.holes.push(hole);
      break;

    case "O":
    case "D":
      // Oval/D shape
      shape.absellipse(x + w / 2, h / 2, w / 2, h / 2, 0, Math.PI * 2, false, 0);
      const holeO = new THREE.Path();
      holeO.absellipse(x + w / 2, h / 2, w / 2 - s, h / 2 - s, 0, Math.PI * 2, false, 0);
      shape.holes.push(holeO);
      break;

    default:
      // Generic rectangular shape with rounded corners
      const r = s / 2;
      shape.moveTo(x + r, 0);
      shape.lineTo(x + w - r, 0);
      shape.quadraticCurveTo(x + w, 0, x + w, r);
      shape.lineTo(x + w, h - r);
      shape.quadraticCurveTo(x + w, h, x + w - r, h);
      shape.lineTo(x + r, h);
      shape.quadraticCurveTo(x, h, x, h - r);
      shape.lineTo(x, r);
      shape.quadraticCurveTo(x, 0, x + r, 0);
      break;
  }

  return shape;
}

/**
 * Create shape for lowercase letters
 */
function createLowercaseShape(
  char: string,
  scale: number,
  xOffset: number,
  strokeWidth: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const h = 70 * scale; // Lowercase height
  const w = 50 * scale; // Lowercase width
  const s = strokeWidth;
  const x = xOffset;

  // Generic rounded rectangle for lowercase
  const r = s / 2;
  shape.moveTo(x + r, 0);
  shape.lineTo(x + w - r, 0);
  shape.quadraticCurveTo(x + w, 0, x + w, r);
  shape.lineTo(x + w, h - r);
  shape.quadraticCurveTo(x + w, h, x + w - r, h);
  shape.lineTo(x + r, h);
  shape.quadraticCurveTo(x, h, x, h - r);
  shape.lineTo(x, r);
  shape.quadraticCurveTo(x, 0, x + r, 0);

  return shape;
}

/**
 * Create shape for numbers
 */
function createNumberShape(
  char: string,
  scale: number,
  xOffset: number,
  strokeWidth: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const h = 100 * scale;
  const w = 55 * scale;
  const s = strokeWidth;
  const x = xOffset;

  if (char === "0" || char === "8") {
    // Oval shape
    shape.absellipse(x + w / 2, h / 2, w / 2, h / 2, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(x + w / 2, h / 2, w / 2 - s, h / 2 - s, 0, Math.PI * 2, false, 0);
    shape.holes.push(hole);
  } else {
    // Generic rectangular
    const r = s / 2;
    shape.moveTo(x + r, 0);
    shape.lineTo(x + w - r, 0);
    shape.quadraticCurveTo(x + w, 0, x + w, r);
    shape.lineTo(x + w, h - r);
    shape.quadraticCurveTo(x + w, h, x + w - r, h);
    shape.lineTo(x + r, h);
    shape.quadraticCurveTo(x, h, x, h - r);
    shape.lineTo(x, r);
    shape.quadraticCurveTo(x, 0, x + r, 0);
  }

  return shape;
}

/**
 * Get approximate character width ratio
 */
function getCharacterWidth(char: string): number {
  const narrow = "iIlj1";
  const wide = "mMwWAOQ@";

  if (narrow.includes(char)) {return 0.35;}
  if (wide.includes(char)) {return 0.8;}
  return 0.6; // Average width
}

/**
 * Create a fallback shape when text conversion fails
 */
function createFallbackShape(fontSize: number): THREE.Shape {
  const shape = new THREE.Shape();
  const scale = fontSize / 100;
  const w = 50 * scale;
  const h = 70 * scale;

  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, h);
  shape.lineTo(0, h);
  shape.closePath();

  return shape;
}

// =============================================================================
// 3D Geometry Creation
// =============================================================================

/**
 * Asymmetric bevel configuration for ECMA-376 compliant extrusion.
 * Supports separate top (front) and bottom (back) bevels.
 */
export type AsymmetricBevelConfig = {
  /** Front face bevel (bevelT) */
  readonly top?: BevelConfig;
  /** Back face bevel (bevelB) */
  readonly bottom?: BevelConfig;
};

/**
 * Create extruded 3D geometry from shapes (legacy single bevel)
 */
export function createExtrudedGeometry(
  shapes: THREE.Shape[],
  extrusionDepth: number,
  bevel: BevelConfig | undefined,
): THREE.BufferGeometry {
  return createAsymmetricExtrudedGeometry(shapes, extrusionDepth, {
    top: bevel,
    bottom: bevel,
  });
}

/**
 * Create extruded 3D geometry with asymmetric top/bottom bevels.
 *
 * ECMA-376 supports separate bevelT (front) and bevelB (back) configurations.
 * This implementation handles asymmetric bevels by:
 * 1. Generating geometry with the larger bevel
 * 2. Post-processing back-face bevel vertices to use bevelBottom settings
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export function createAsymmetricExtrudedGeometry(
  shapes: THREE.Shape[],
  extrusionDepth: number,
  bevel: AsymmetricBevelConfig,
): THREE.BufferGeometry {
  const topBevel = bevel.top;
  const bottomBevel = bevel.bottom;

  // If bevels are identical or only one exists, use standard extrusion
  const areBevelsIdentical =
    topBevel?.thickness === bottomBevel?.thickness &&
    topBevel?.size === bottomBevel?.size &&
    topBevel?.segments === bottomBevel?.segments;

  if (areBevelsIdentical || (!topBevel && !bottomBevel)) {
    return createSymmetricExtrudedGeometry(shapes, extrusionDepth, topBevel ?? bottomBevel);
  }

  // Use the larger bevel for initial generation
  const primaryBevel = selectLargerBevel(topBevel, bottomBevel);
  const secondaryBevel = primaryBevel === topBevel ? bottomBevel : topBevel;
  const isPrimaryTop = primaryBevel === topBevel;

  // Generate with primary (larger) bevel
  const geometry = createSymmetricExtrudedGeometry(shapes, extrusionDepth, primaryBevel);

  // Post-process to adjust secondary bevel vertices
  if (secondaryBevel && primaryBevel) {
    adjustBevelVertices(geometry, extrusionDepth, primaryBevel, secondaryBevel, isPrimaryTop);
  }

  return geometry;
}

/**
 * Create geometry with symmetric bevels (standard Three.js approach)
 */
function createSymmetricExtrudedGeometry(
  shapes: THREE.Shape[],
  extrusionDepth: number,
  bevel: BevelConfig | undefined,
): THREE.BufferGeometry {
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: extrusionDepth,
    bevelEnabled: bevel !== undefined,
    bevelThickness: bevel?.thickness ?? 0,
    bevelSize: bevel?.size ?? 0,
    bevelSegments: bevel?.segments ?? 1,
    curveSegments: 12,
  };

  const geometries: THREE.BufferGeometry[] = [];

  for (const shape of shapes) {
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometries.push(geometry);
  }

  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  return mergeGeometries(geometries);
}

/**
 * Select the larger bevel for primary geometry generation
 */
function selectLargerBevel(
  top: BevelConfig | undefined,
  bottom: BevelConfig | undefined,
): BevelConfig | undefined {
  if (!top) return bottom;
  if (!bottom) return top;

  const topSize = top.thickness + top.size;
  const bottomSize = bottom.thickness + bottom.size;

  return topSize >= bottomSize ? top : bottom;
}

/**
 * Adjust bevel vertices to achieve asymmetric bevel effect.
 *
 * This modifies vertices in the secondary bevel region (front or back)
 * to match the secondary bevel configuration.
 */
function adjustBevelVertices(
  geometry: THREE.BufferGeometry,
  extrusionDepth: number,
  primaryBevel: BevelConfig,
  secondaryBevel: BevelConfig,
  isPrimaryTop: boolean,
): void {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;

  const primaryThickness = primaryBevel.thickness;
  const secondaryThickness = secondaryBevel.thickness;

  // Scale factor for the secondary bevel
  const thicknessRatio = secondaryThickness / primaryThickness;
  const sizeRatio = secondaryBevel.size / primaryBevel.size;

  // Determine z-range for secondary bevel vertices
  // If primary is top, secondary is bottom (back face, high z values)
  // If primary is bottom, secondary is top (front face, low z values)
  const zThreshold = isPrimaryTop
    ? extrusionDepth - primaryThickness // Back face threshold
    : primaryThickness; // Front face threshold

  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);

    const isSecondaryRegion = isPrimaryTop
      ? z > zThreshold // Back face region
      : z < zThreshold; // Front face region

    if (isSecondaryRegion) {
      // Calculate how far into the bevel region this vertex is
      const bevelProgress = isPrimaryTop
        ? (z - zThreshold) / primaryThickness
        : (zThreshold - z) / primaryThickness;

      if (bevelProgress >= 0 && bevelProgress <= 1) {
        // Adjust z position based on thickness ratio
        const newZ = isPrimaryTop
          ? zThreshold + bevelProgress * secondaryThickness
          : zThreshold - bevelProgress * secondaryThickness;

        positions.setZ(i, newZ);

        // Adjust xy based on size ratio (bevel inset)
        const x = positions.getX(i);
        const y = positions.getY(i);
        const nx = normals.getX(i);
        const ny = normals.getY(i);

        // Scale the bevel inset
        const insetAdjustment = (1 - sizeRatio) * bevelProgress * primaryBevel.size;
        positions.setX(i, x + nx * insetAdjustment);
        positions.setY(i, y + ny * insetAdjustment);
      }
    }
  }

  positions.needsUpdate = true;
  normals.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Merge multiple geometries into one
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Calculate total vertex count
  let totalVertices = 0;
  let totalIndices = 0;

  for (const geom of geometries) {
    totalVertices += geom.attributes.position.count;
    if (geom.index) {
      totalIndices += geom.index.count;
    }
  }

  // Create merged arrays
  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const indices: number[] = [];

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    const normalAttr = geom.attributes.normal;

    // Copy positions
    for (let i = 0; i < posAttr.count * 3; i++) {
      positions[vertexOffset * 3 + i] = posAttr.array[i];
    }

    // Copy normals
    if (normalAttr) {
      for (let i = 0; i < normalAttr.count * 3; i++) {
        normals[vertexOffset * 3 + i] = normalAttr.array[i];
      }
    }

    // Copy indices with offset
    if (geom.index) {
      for (let i = 0; i < geom.index.count; i++) {
        indices.push(geom.index.array[i] + vertexOffset);
      }
    }

    vertexOffset += posAttr.count;
  }

  // Create merged geometry
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  if (indices.length > 0) {
    merged.setIndex(indices);
  }

  return merged;
}

/**
 * Center geometry around origin
 */
export function centerGeometry(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {return;}

  const center = new THREE.Vector3();
  box.getCenter(center);

  geometry.translate(-center.x, -center.y, -center.z);
}

/**
 * Scale geometry to fit within bounds
 */
export function scaleGeometryToFit(
  geometry: THREE.BufferGeometry,
  maxWidth: number,
  maxHeight: number,
): number {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {return 1;}

  const size = new THREE.Vector3();
  box.getSize(size);

  const scaleX = maxWidth / size.x;
  const scaleY = maxHeight / size.y;
  const scale = Math.min(scaleX, scaleY, 1);

  geometry.scale(scale, scale, scale);
  return scale;
}
