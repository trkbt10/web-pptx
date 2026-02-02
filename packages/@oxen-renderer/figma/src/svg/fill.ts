/**
 * @file Fill rendering for Figma nodes
 */

import type {
  FigPaint,
  FigColor,
  FigGradientPaint,
  FigGradientStop,
  FigImagePaint,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../types";
import { linearGradient, radialGradient, stop, pattern, image, type SvgString } from "./primitives";

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert Figma color (0-1 range) to CSS hex color
 */
export function figColorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Convert Figma color to CSS rgba
 */
export function figColorToRgba(color: FigColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}

// =============================================================================
// Paint Type Helper
// =============================================================================

/**
 * Get paint type as string (handles both string and enum object forms)
 */
export function getPaintType(paint: FigPaint): string {
  const type = paint.type;
  if (typeof type === "string") {
    return type;
  }
  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "UNKNOWN";
}

// =============================================================================
// Fill Attributes
// =============================================================================

/**
 * Fill attributes for SVG elements
 */
export type FillAttrs = {
  fill: string;
  "fill-opacity"?: number;
};

/**
 * Get fill attributes from Figma paints
 */
export function getFillAttrs(
  paints: readonly FigPaint[] | undefined,
  ctx: FigSvgRenderContext
): FillAttrs {
  if (!paints || paints.length === 0) {
    return { fill: "none" };
  }

  // Find the first visible paint
  const visiblePaint = paints.find((p) => p.visible !== false);
  if (!visiblePaint) {
    return { fill: "none" };
  }

  return paintToFillAttrs(visiblePaint, ctx);
}

/**
 * Build fill attrs with optional opacity
 */
function buildFillWithOpacity(fill: string, opacity: number): FillAttrs {
  if (opacity < 1) {
    return { fill, "fill-opacity": opacity };
  }
  return { fill };
}

/**
 * Convert a single paint to fill attributes
 */
function paintToFillAttrs(paint: FigPaint, ctx: FigSvgRenderContext): FillAttrs {
  const opacity = paint.opacity ?? 1;
  const paintType = getPaintType(paint);

  switch (paintType) {
    case "SOLID": {
      const solidPaint = paint as FigPaint & { color: FigColor };
      const color = figColorToHex(solidPaint.color);
      return buildFillWithOpacity(color, opacity);
    }

    case "GRADIENT_LINEAR": {
      const gradientPaint = paint as FigGradientPaint;
      const gradientId = createLinearGradient(gradientPaint, ctx);
      return buildFillWithOpacity(`url(#${gradientId})`, opacity);
    }

    case "GRADIENT_RADIAL": {
      const gradientPaint = paint as FigGradientPaint;
      const gradientId = createRadialGradient(gradientPaint, ctx);
      return buildFillWithOpacity(`url(#${gradientId})`, opacity);
    }

    case "IMAGE": {
      const imagePaint = paint as FigImagePaint;
      const gradientId = createImagePattern(imagePaint, ctx);
      if (gradientId) {
        return buildFillWithOpacity(`url(#${gradientId})`, opacity);
      }
      // Fallback to placeholder if no image found
      return { fill: "#cccccc" };
    }

    default:
      return { fill: "none" };
  }
}

// =============================================================================
// Gradient Creation
// =============================================================================

/**
 * Alternative gradient stop format used in .fig files
 */
type FigGradientStopAlt = {
  readonly color: FigColor;
  readonly position: number;
};

/**
 * Get gradient stops from paint (handles both formats)
 */
function getGradientStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  // Try gradientStops first (API format)
  if (paint.gradientStops && paint.gradientStops.length > 0) {
    return paint.gradientStops;
  }

  // Try stops (fig file format)
  const paintData = paint as Record<string, unknown>;
  const stops = paintData.stops as readonly FigGradientStopAlt[] | undefined;
  if (stops && stops.length > 0) {
    return stops;
  }

  return [];
}

/**
 * Get gradient direction from transform matrix
 */
function getGradientDirectionFromTransform(
  transform: { m00?: number; m01?: number; m10?: number; m11?: number; m02?: number; m12?: number } | undefined
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  if (!transform) {
    return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
  }

  // The transform matrix describes how to map from gradient space (0-1) to object space
  // m02, m12 are the translation (start point)
  // m00, m01, m10, m11 are the rotation/scale matrix
  const startX = transform.m02 ?? 0;
  const startY = transform.m12 ?? 0;

  // End point is start + first column of matrix (direction)
  const endX = startX + (transform.m00 ?? 1);
  const endY = startY + (transform.m10 ?? 0);

  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
  };
}

/**
 * Create a linear gradient def and return its ID
 */
function createLinearGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("lg");

  // Get gradient direction
  let start: { x: number; y: number };
  let end: { x: number; y: number };

  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    // API format with handles
    start = handles[0] ?? { x: 0, y: 0.5 };
    end = handles[1] ?? { x: 1, y: 0.5 };
  } else {
    // Fig file format with transform matrix
    const paintData = paint as Record<string, unknown>;
    const transform = paintData.transform as { m00?: number; m01?: number; m10?: number; m11?: number; m02?: number; m12?: number } | undefined;
    const direction = getGradientDirectionFromTransform(transform);
    start = direction.start;
    end = direction.end;
  }

  const stops = createGradientStops(getGradientStops(paint));

  const gradientDef = linearGradient(
    {
      id,
      x1: `${start.x * 100}%`,
      y1: `${start.y * 100}%`,
      x2: `${end.x * 100}%`,
      y2: `${end.y * 100}%`,
    },
    ...stops
  );

  ctx.defs.add(gradientDef);
  return id;
}

/**
 * Create a radial gradient def and return its ID
 */
function createRadialGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("rg");

  // Get center and radius
  let center: { x: number; y: number };
  let radius: number;

  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    // API format with handles
    center = handles[0] ?? { x: 0.5, y: 0.5 };
    const edge = handles[1] ?? { x: 1, y: 0.5 };
    radius = Math.sqrt(
      Math.pow((edge.x - center.x), 2) + Math.pow((edge.y - center.y), 2)
    );
  } else {
    // Fig file format - use transform
    const paintData = paint as Record<string, unknown>;
    const transform = paintData.transform as { m00?: number; m01?: number; m10?: number; m11?: number; m02?: number; m12?: number } | undefined;
    center = { x: transform?.m02 ?? 0.5, y: transform?.m12 ?? 0.5 };
    radius = transform?.m00 ?? 0.5;
  }

  const stops = createGradientStops(getGradientStops(paint));

  const gradientDef = radialGradient(
    {
      id,
      cx: `${center.x * 100}%`,
      cy: `${center.y * 100}%`,
      r: `${Math.abs(radius) * 100}%`,
    },
    ...stops
  );

  ctx.defs.add(gradientDef);
  return id;
}

/**
 * Get stop opacity if less than 1
 */
function getStopOpacity(alpha: number): number | undefined {
  if (alpha < 1) {
    return alpha;
  }
  return undefined;
}

/**
 * Create gradient stop elements
 */
function createGradientStops(stops: readonly FigGradientStop[]): SvgString[] {
  return stops.map((s) =>
    stop({
      offset: `${s.position * 100}%`,
      "stop-color": figColorToHex(s.color),
      "stop-opacity": getStopOpacity(s.color.a),
    })
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if paints array has any visible fills
 */
export function hasVisibleFill(paints: readonly FigPaint[] | undefined): boolean {
  if (!paints || paints.length === 0) {
    return false;
  }
  return paints.some((p) => p.visible !== false);
}

// =============================================================================
// Image Pattern Creation
// =============================================================================

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert hash array to hex string
 */
function hashArrayToHex(hash: readonly number[]): string {
  return hash.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get image ref from paint (handles both API and .fig file formats)
 */
function getImageRef(paint: FigImagePaint): string | null {
  // API format: imageRef is a string
  if (paint.imageRef) {
    return paint.imageRef;
  }

  // .fig file format: image.hash is a byte array
  const paintData = paint as Record<string, unknown>;
  const image = paintData.image as { hash?: readonly number[] } | undefined;
  if (image?.hash && Array.isArray(image.hash) && image.hash.length > 0) {
    return hashArrayToHex(image.hash);
  }

  // Also check imageHash for older formats
  const imageHash = paintData.imageHash as string | readonly number[] | undefined;
  if (typeof imageHash === "string") {
    return imageHash;
  }
  if (Array.isArray(imageHash) && imageHash.length > 0) {
    return hashArrayToHex(imageHash);
  }

  return null;
}

/**
 * Create an image pattern def and return its ID
 */
function createImagePattern(
  paint: FigImagePaint,
  ctx: FigSvgRenderContext
): string | null {
  const imageRef = getImageRef(paint);
  if (!imageRef) {
    return null;
  }

  // Look up the image in context
  const figImage = ctx.images.get(imageRef);
  if (!figImage) {
    return null;
  }

  return createPatternFromImage(figImage, paint, ctx);
}

/**
 * Create a pattern element from an image
 */
function createPatternFromImage(
  figImage: { data: Uint8Array; mimeType: string },
  paint: FigImagePaint,
  ctx: FigSvgRenderContext
): string {
  const id = ctx.defs.generateId("img");

  // Convert image data to base64 data URI
  const base64 = uint8ArrayToBase64(figImage.data);
  const dataUri = `data:${figImage.mimeType};base64,${base64}`;

  // Create pattern with image
  // Use patternContentUnits="objectBoundingBox" so image coordinates are normalized (0-1)
  // This means width/height of 1 fills the entire pattern space
  const patternDef = pattern(
    {
      id,
      patternContentUnits: "objectBoundingBox",
      width: 1,
      height: 1,
    },
    image({
      href: dataUri,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      preserveAspectRatio: getPreserveAspectRatio(paint),
    })
  );

  ctx.defs.add(patternDef);
  return id;
}

/**
 * Get SVG preserveAspectRatio from Figma scale mode
 */
function getPreserveAspectRatio(paint: FigImagePaint): string {
  // Handle both string and enum object formats
  const paintData = paint as Record<string, unknown>;
  let scaleMode = paint.scaleMode;

  // .fig files use imageScaleMode as an enum object
  if (!scaleMode && paintData.imageScaleMode) {
    const imageScaleMode = paintData.imageScaleMode as { name?: string } | string;
    scaleMode = typeof imageScaleMode === "string"
      ? imageScaleMode as "FILL" | "FIT" | "CROP" | "TILE"
      : imageScaleMode.name as "FILL" | "FIT" | "CROP" | "TILE" | undefined;
  }

  switch (scaleMode) {
    case "FIT":
      return "xMidYMid meet";
    case "FILL":
      // FILL stretches to fill the entire space (no aspect ratio preservation)
      return "none";
    case "CROP":
      // CROP maintains aspect ratio but clips
      return "xMidYMid slice";
    case "TILE":
      return "none";
    default:
      // Default to FILL behavior for most UI images
      return "none";
  }
}
