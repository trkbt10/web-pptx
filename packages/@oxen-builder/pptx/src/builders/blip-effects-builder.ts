/**
 * @file Build BlipEffects domain object from BlipEffectSpec
 */

import type { BlipEffects } from "@oxen-office/pptx/domain/color/types";
import type { Degrees, Percent, Pixels } from "@oxen-office/ooxml/domain/units";
import { buildColor } from "@oxen-builder/drawing-ml/fill";
import type { BlipEffectSpec } from "../types";

/**
 * Convert a CLI BlipEffectSpec into the domain BlipEffects object.
 *
 * Percent values in the spec are expressed as 0-100, and converted to 0-100000.
 */
export function buildBlipEffectsFromSpec(spec: BlipEffectSpec): BlipEffects {
  const effects: BlipEffects = {};

  if (spec.alphaBiLevel) {
    (effects as { alphaBiLevel?: { threshold: Percent } }).alphaBiLevel = {
      threshold: (spec.alphaBiLevel.threshold * 1000) as Percent,
    };
  }
  if (spec.alphaCeiling) {
    (effects as { alphaCeiling?: boolean }).alphaCeiling = true;
  }
  if (spec.alphaFloor) {
    (effects as { alphaFloor?: boolean }).alphaFloor = true;
  }
  if (spec.alphaInv) {
    (effects as { alphaInv?: boolean }).alphaInv = true;
  }
  if (spec.alphaMod) {
    (effects as { alphaMod?: boolean }).alphaMod = true;
  }
  if (spec.alphaRepl) {
    (effects as { alphaRepl?: { alpha: Percent } }).alphaRepl = {
      alpha: (spec.alphaRepl.alpha * 1000) as Percent,
    };
  }

  if (spec.biLevel) {
    (effects as { biLevel?: { threshold: Percent } }).biLevel = {
      threshold: (spec.biLevel.threshold * 1000) as Percent,
    };
  }
  if (spec.blur) {
    (effects as { blur?: { radius: Pixels; grow: boolean } }).blur = {
      radius: spec.blur.radius as Pixels,
      grow: false,
    };
  }
  if (spec.colorChange) {
    (effects as {
      colorChange?: { from: ReturnType<typeof buildColor>; to: ReturnType<typeof buildColor>; useAlpha: boolean };
    }).colorChange = {
      from: buildColor(spec.colorChange.from),
      to: buildColor(spec.colorChange.to),
      useAlpha: spec.colorChange.useAlpha ?? false,
    };
  }
  if (spec.colorReplace) {
    (effects as { colorReplace?: { color: ReturnType<typeof buildColor> } }).colorReplace = {
      color: buildColor(spec.colorReplace.color),
    };
  }
  if (spec.duotone) {
    (effects as { duotone?: { colors: readonly [ReturnType<typeof buildColor>, ReturnType<typeof buildColor>] } }).duotone =
      {
        colors: [buildColor(spec.duotone.colors[0]), buildColor(spec.duotone.colors[1])],
      };
  }
  if (spec.grayscale) {
    (effects as { grayscale?: boolean }).grayscale = true;
  }
  if (spec.hsl) {
    (effects as { hsl?: { hue: Degrees; saturation: Percent; luminance: Percent } }).hsl = {
      hue: spec.hsl.hue as Degrees,
      saturation: (spec.hsl.saturation * 1000) as Percent,
      luminance: (spec.hsl.luminance * 1000) as Percent,
    };
  }
  if (spec.luminance) {
    (effects as { luminance?: { brightness: Percent; contrast: Percent } }).luminance = {
      brightness: (spec.luminance.brightness * 1000) as Percent,
      contrast: (spec.luminance.contrast * 1000) as Percent,
    };
  }
  if (spec.tint) {
    (effects as { tint?: { hue: Degrees; amount: Percent } }).tint = {
      hue: spec.tint.hue as Degrees,
      amount: (spec.tint.amount * 1000) as Percent,
    };
  }
  if (spec.alphaModFix !== undefined) {
    (effects as { alphaModFix?: { amount: Percent } }).alphaModFix = {
      amount: (spec.alphaModFix * 1000) as Percent,
    };
  }

  return effects;
}
