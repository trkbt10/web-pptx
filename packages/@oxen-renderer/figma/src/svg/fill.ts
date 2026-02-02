/**
 * @file Fill rendering for Figma nodes
 */

import type {
  FigPaint,
  FigColor,
  FigGradientPaint,
  FigGradientStop,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../types";
import { linearGradient, radialGradient, stop, type SvgString } from "./primitives";

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

  switch (paint.type) {
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

    case "IMAGE":
      // Image fills require pattern definitions - simplified for now
      return { fill: "#cccccc" };

    default:
      return { fill: "none" };
  }
}

// =============================================================================
// Gradient Creation
// =============================================================================

/**
 * Create a linear gradient def and return its ID
 */
function createLinearGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("lg");
  const handles = paint.gradientHandlePositions;

  // Figma gradient handles: [start, end, width-control]
  const start = handles[0] ?? { x: 0, y: 0.5 };
  const end = handles[1] ?? { x: 1, y: 0.5 };

  const stops = createGradientStops(paint.gradientStops);

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
  const handles = paint.gradientHandlePositions;

  // Figma radial gradient handles: [center, edge, angle-control]
  const center = handles[0] ?? { x: 0.5, y: 0.5 };
  const edge = handles[1] ?? { x: 1, y: 0.5 };

  // Calculate radius from center to edge
  const radius = Math.sqrt(
    Math.pow((edge.x - center.x), 2) + Math.pow((edge.y - center.y), 2)
  );

  const stops = createGradientStops(paint.gradientStops);

  const gradientDef = radialGradient(
    {
      id,
      cx: `${center.x * 100}%`,
      cy: `${center.y * 100}%`,
      r: `${radius * 100}%`,
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
