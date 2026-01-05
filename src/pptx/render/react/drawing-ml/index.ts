/**
 * @file DrawingML React rendering module
 *
 * React components and hooks for rendering DrawingML elements.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

// Color module
export {
  useColor,
  resolveColorForReact,
  ColorSwatch,
  ColorSwatchRow,
  type ResolvedColorResult,
  type ColorSwatchProps,
  type ColorSwatchRowProps,
} from "./color";

// Fill module
export {
  usePatternFill,
  resolvePatternFillForReact,
  PatternDef,
  getPatternGeometry,
  isPatternSupported,
  getSupportedPatterns,
  type PatternFillResult,
  type PatternDefProps,
} from "./fill";

// Background module
export {
  useBackground,
  resolveBackgroundForReact,
  type BackgroundResult,
} from "./background";

// Effects module
export {
  useEffects,
  resolveEffectsForReact,
  ShadowFilterDef,
  GlowFilterDef,
  SoftEdgeFilterDef,
  directionToOffset,
  resolveShadowProps,
  resolveGlowProps,
  type EffectsResult,
  type ShadowFilterDefProps,
  type GlowFilterDefProps,
  type SoftEdgeFilterDefProps,
  type ResolvedShadowProps,
  type ResolvedGlowProps,
} from "./effects";

// Shape module
export {
  useShapeStyle,
  type ShapeStyleInput,
  type ShapeStyleResult,
  type ShapeSvgProps,
} from "./shape";
