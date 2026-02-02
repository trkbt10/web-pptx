/**
 * @file Effect rendering for Figma nodes (shadows, blur, etc.)
 */

import type { FigColor, FigVector } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../types";
import {
  filter,
  feFlood,
  feColorMatrix,
  feOffset,
  feGaussianBlur,
  feBlend,
  type SvgString,
} from "./primitives";

// =============================================================================
// Effect Types
// =============================================================================

/**
 * Figma effect type enum
 */
export type FigEffectType =
  | "INNER_SHADOW"
  | "DROP_SHADOW"
  | "LAYER_BLUR"
  | "BACKGROUND_BLUR";

/**
 * Figma effect interface
 */
export type FigEffect = {
  readonly type: FigEffectType | { value: number; name: FigEffectType };
  readonly visible?: boolean;
  readonly color?: FigColor;
  readonly offset?: FigVector;
  readonly radius?: number;
  readonly spread?: number;
  readonly blendMode?: string | { value: number; name: string };
  readonly showShadowBehindNode?: boolean;
};

// =============================================================================
// Effect Helpers
// =============================================================================

/**
 * Get effect type as string
 */
function getEffectType(effect: FigEffect): FigEffectType {
  const type = effect.type;
  if (typeof type === "string") {
    return type;
  }
  if (type && typeof type === "object" && "name" in type) {
    return type.name;
  }
  return "DROP_SHADOW";
}

/**
 * Check if effects array has visible drop shadows
 */
export function hasDropShadow(effects: readonly FigEffect[] | undefined): boolean {
  if (!effects || effects.length === 0) {
    return false;
  }
  return effects.some(
    (e) => e.visible !== false && getEffectType(e) === "DROP_SHADOW"
  );
}

/**
 * Get drop shadows from effects array
 */
export function getDropShadows(effects: readonly FigEffect[] | undefined): readonly FigEffect[] {
  if (!effects || effects.length === 0) {
    return [];
  }
  return effects.filter(
    (e) => e.visible !== false && getEffectType(e) === "DROP_SHADOW"
  );
}

// =============================================================================
// Filter Creation
// =============================================================================

/**
 * Create a drop shadow filter definition
 *
 * Based on Figma's SVG export format which uses multiple blur layers
 * for smoother shadow rendering.
 */
export function createDropShadowFilter(
  shadows: readonly FigEffect[],
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number }
): { id: string; def: SvgString } | null {
  if (shadows.length === 0) {
    return null;
  }

  const id = ctx.defs.generateId("shadow");

  // Calculate filter region to accommodate all shadows
  // We need to expand the filter region to include the shadow offsets and blur radii
  let expandX = 0;
  let expandY = 0;

  for (const shadow of shadows) {
    const offsetX = Math.abs(shadow.offset?.x ?? 0);
    const offsetY = Math.abs(shadow.offset?.y ?? 0);
    const blur = (shadow.radius ?? 0) * 1.5; // stdDeviation is radius/2, but we need extra space
    expandX = Math.max(expandX, offsetX + blur);
    expandY = Math.max(expandY, offsetY + blur);
  }

  // Build filter primitives
  const primitives: SvgString[] = [];

  // Start with BackgroundImageFix
  primitives.push(
    feFlood({ "flood-opacity": 0, result: "BackgroundImageFix" })
  );

  // Generate shadow layers
  let previousResult = "BackgroundImageFix";

  for (let i = 0; i < shadows.length; i++) {
    const shadow = shadows[i];
    const effectNum = i + 1;
    const shadowResult = "effect" + effectNum + "_dropShadow_" + id;

    // Extract shadow alpha from source
    primitives.push(
      feColorMatrix({
        in: "SourceAlpha",
        type: "matrix",
        values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0",
        result: "hardAlpha",
      })
    );

    // Apply offset
    primitives.push(
      feOffset({
        dy: shadow.offset?.y ?? 0,
      })
    );

    // Apply blur (stdDeviation = radius / 2 for Gaussian blur to match Figma)
    const stdDeviation = (shadow.radius ?? 0) / 2;
    primitives.push(
      feGaussianBlur({
        stdDeviation,
      })
    );

    // Apply shadow color via color matrix
    const color = shadow.color ?? { r: 0, g: 0, b: 0, a: 0.25 };
    primitives.push(
      feColorMatrix({
        type: "matrix",
        values: "0 0 0 0 " + color.r + " 0 0 0 0 " + color.g + " 0 0 0 0 " + color.b + " 0 0 0 0 " + color.a + " 0",
      })
    );

    // Blend with previous result
    primitives.push(
      feBlend({
        mode: "normal",
        in2: previousResult,
        result: shadowResult,
      })
    );

    previousResult = shadowResult;
  }

  // Final blend with source graphic
  primitives.push(
    feBlend({
      mode: "normal",
      in: "SourceGraphic",
      in2: previousResult,
      result: "shape",
    })
  );

  // Create filter with expanded bounds
  const filterDef = filter(
    {
      id,
      x: bounds.x - expandX,
      y: bounds.y - expandY,
      width: bounds.width + expandX * 2,
      height: bounds.height + expandY * 2,
      filterUnits: "userSpaceOnUse",
      "color-interpolation-filters": "sRGB",
    },
    ...primitives
  );

  return { id, def: filterDef };
}

/**
 * Get filter attribute from effects
 */
export function getFilterAttr(
  effects: readonly FigEffect[] | undefined,
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number }
): string | undefined {
  const shadows = getDropShadows(effects);
  if (shadows.length === 0) {
    return undefined;
  }

  const result = createDropShadowFilter(shadows, ctx, bounds);
  if (!result) {
    return undefined;
  }

  ctx.defs.add(result.def);
  return "url(#" + result.id + ")";
}
