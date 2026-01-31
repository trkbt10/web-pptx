/**
 * @file Effects building utilities for PPTX shapes
 */

import type { Effects, ReflectionEffect } from "@oxen-office/pptx/domain/effects";
import type { Pixels, Degrees, Percent } from "@oxen-office/ooxml/domain/units";
import type { Shape3d, Bevel3d } from "@oxen-office/pptx/domain/three-d";
import type { EffectsSpec, Shape3dSpec, BevelSpec, ReflectionEffectSpec } from "../types";

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
    (effects as { shadow?: Effects["shadow"] }).shadow = {
      type: "outer",
      color: { spec: { type: "srgb", value: spec.shadow.color } },
      blurRadius: (spec.shadow.blur ?? 4) as Pixels,
      distance: (spec.shadow.distance ?? 3) as Pixels,
      direction: (spec.shadow.direction ?? 45) as Degrees,
    };
  }

  if (spec.glow) {
    (effects as { glow?: Effects["glow"] }).glow = {
      color: { spec: { type: "srgb", value: spec.glow.color } },
      radius: spec.glow.radius as Pixels,
    };
  }

  if (spec.softEdge) {
    (effects as { softEdge?: Effects["softEdge"] }).softEdge = {
      radius: spec.softEdge.radius as Pixels,
    };
  }

  if (spec.reflection) {
    (effects as { reflection?: ReflectionEffect }).reflection = buildReflection(spec.reflection);
  }

  return effects;
}

/**
 * Build 3D bevel from spec
 */
export function buildBevel(spec: BevelSpec): Bevel3d {
  return {
    preset: spec.preset ?? "circle",
    width: (spec.width ?? 8) as Pixels,
    height: (spec.height ?? 8) as Pixels,
  };
}

/**
 * Build 3D shape properties from spec
 */
export function buildShape3d(spec: Shape3dSpec): Shape3d {
  const shape3d: Shape3d = {};

  if (spec.bevelTop) {
    (shape3d as { bevelTop?: Bevel3d }).bevelTop = buildBevel(spec.bevelTop);
  }

  if (spec.bevelBottom) {
    (shape3d as { bevelBottom?: Bevel3d }).bevelBottom = buildBevel(spec.bevelBottom);
  }

  if (spec.material) {
    (shape3d as { preset?: string }).preset = spec.material;
  }

  if (spec.extrusionHeight !== undefined) {
    (shape3d as { extrusionHeight?: Pixels }).extrusionHeight = spec.extrusionHeight as Pixels;
  }

  return shape3d;
}
