/**
 * @file Fill building utilities for PPTX shapes
 */

import type { Fill } from "@oxen-office/pptx/domain/color/types";
import type { GradientFill, PatternFill } from "@oxen-office/ooxml/domain/fill";
import type { Color, ColorTransform } from "@oxen-office/ooxml/domain/color";
import type { Degrees, Percent } from "@oxen-office/ooxml/domain/units";
import type {
  FillSpec,
  GradientFillSpec,
  PatternFillSpec,
  ThemeFillSpec,
  ColorSpec,
  ThemeColorSpec,
  SolidFillSpec,
} from "./types";
import { isThemeColor } from "./types";

/**
 * Build a Color object from ColorSpec
 */
export function buildColor(colorSpec: ColorSpec): Color {
  if (typeof colorSpec === "string") {
    // Hex color
    return { spec: { type: "srgb", value: colorSpec } };
  }

  // Theme color
  const transform: ColorTransform = {};
  if (colorSpec.lumMod !== undefined) {
    transform.lumMod = (colorSpec.lumMod * 1000) as Percent; // Convert 0-100 to 0-100000
  }
  if (colorSpec.lumOff !== undefined) {
    transform.lumOff = (colorSpec.lumOff * 1000) as Percent; // Convert -100 to 100 to -100000 to 100000
  }
  if (colorSpec.tint !== undefined) {
    transform.tint = (colorSpec.tint * 1000) as Percent;
  }
  if (colorSpec.shade !== undefined) {
    transform.shade = (colorSpec.shade * 1000) as Percent;
  }

  return {
    spec: { type: "scheme", value: colorSpec.theme },
    transform: Object.keys(transform).length > 0 ? transform : undefined,
  };
}

/**
 * Build a solid fill object from hex color
 */
export function buildSolidFill(hexColor: string): Fill {
  return {
    type: "solidFill",
    color: { spec: { type: "srgb", value: hexColor } },
  };
}

/**
 * Build a solid fill object from ColorSpec (hex or theme)
 */
export function buildSolidFillFromSpec(colorSpec: ColorSpec): Fill {
  return {
    type: "solidFill",
    color: buildColor(colorSpec),
  };
}

/**
 * Build a theme fill object
 */
export function buildThemeFill(spec: ThemeFillSpec): Fill {
  const themeColorSpec: ThemeColorSpec = {
    theme: spec.theme,
    lumMod: spec.lumMod,
    lumOff: spec.lumOff,
    tint: spec.tint,
    shade: spec.shade,
  };
  return buildSolidFillFromSpec(themeColorSpec);
}

/**
 * Build a gradient fill object
 */
export function buildGradientFill(spec: GradientFillSpec): GradientFill {
  const stops = spec.stops.map((stop) => ({
    position: (stop.position * 1000) as number, // Convert 0-100 to 0-100000
    color: buildColor(stop.color),
  }));

  if (spec.gradientType === "linear") {
    return {
      type: "gradientFill",
      stops,
      linear: {
        angle: (spec.angle ?? 0) as Degrees,
        scaled: false,
      },
      rotWithShape: true,
    };
  }
  if (spec.gradientType === "radial") {
    return {
      type: "gradientFill",
      stops,
      path: {
        path: "circle",
      },
      rotWithShape: true,
    };
  }
  // path type
  return {
    type: "gradientFill",
    stops,
    path: {
      path: "rect",
    },
    rotWithShape: true,
  };
}

/**
 * Build a pattern fill object
 */
export function buildPatternFill(spec: PatternFillSpec): PatternFill {
  return {
    type: "patternFill",
    preset: spec.preset,
    foregroundColor: buildColor(spec.fgColor),
    backgroundColor: buildColor(spec.bgColor),
  };
}

/**
 * Build a fill object from FillSpec
 */
export function buildFill(fillSpec: FillSpec): Fill | undefined {
  if (typeof fillSpec === "string") {
    return buildSolidFill(fillSpec);
  }
  switch (fillSpec.type) {
    case "solid": {
      const solidSpec = fillSpec as SolidFillSpec;
      if (isThemeColor(solidSpec.color)) {
        return buildSolidFillFromSpec(solidSpec.color);
      }
      return buildSolidFill(solidSpec.color);
    }
    case "gradient":
      return buildGradientFill(fillSpec);
    case "pattern":
      return buildPatternFill(fillSpec);
    case "theme":
      return buildThemeFill(fillSpec);
    default:
      return undefined;
  }
}
