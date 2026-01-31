/**
 * @file Effects builders for DrawingML
 */

import type { Effects, ReflectionEffect, ShadowEffect, GlowEffect, SoftEdgeEffect } from "@oxen-office/ooxml/domain/effects";
import type { Pixels, Degrees, Percent } from "@oxen-office/ooxml/domain/units";
import type { EffectsSpec, ReflectionEffectSpec } from "../types";

/**
 * Build reflection effect from spec
 */
function buildReflection(spec: ReflectionEffectSpec): ReflectionEffect {
  return {
    blurRadius: (spec.blurRadius ?? 0) as Pixels,
    startOpacity: ((spec.startOpacity ?? 100) * 1000) as Percent, // Convert 0-100 to 0-100000
    startPosition: 0 as Percent, // Default start position
    endOpacity: ((spec.endOpacity ?? 0) * 1000) as Percent, // Convert 0-100 to 0-100000
    endPosition: 100000 as Percent, // Default end position (100%)
    distance: (spec.distance ?? 0) as Pixels,
    direction: (spec.direction ?? 0) as Degrees,
    fadeDirection: (spec.fadeDirection ?? 90) as Degrees,
    scaleX: ((spec.scaleX ?? 100) * 1000) as Percent, // Convert 0-100 to 0-100000
    scaleY: ((spec.scaleY ?? -100) * 1000) as Percent, // Default -100% for mirror effect
  };
}

/**
 * Build effects object from spec
 */
export function buildEffects(spec: EffectsSpec): Effects {
  const effects: Effects = {};

  if (spec.shadow) {
    (effects as { shadow?: ShadowEffect }).shadow = {
      type: "outer",
      color: { spec: { type: "srgb", value: spec.shadow.color } },
      blurRadius: (spec.shadow.blur ?? 4) as Pixels,
      distance: (spec.shadow.distance ?? 3) as Pixels,
      direction: (spec.shadow.direction ?? 45) as Degrees,
    };
  }

  if (spec.glow) {
    (effects as { glow?: GlowEffect }).glow = {
      color: { spec: { type: "srgb", value: spec.glow.color } },
      radius: spec.glow.radius as Pixels,
    };
  }

  if (spec.softEdge) {
    (effects as { softEdge?: SoftEdgeEffect }).softEdge = {
      radius: spec.softEdge.radius as Pixels,
    };
  }

  if (spec.reflection) {
    (effects as { reflection?: ReflectionEffect }).reflection = buildReflection(spec.reflection);
  }

  return effects;
}
