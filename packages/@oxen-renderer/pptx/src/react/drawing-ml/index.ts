/**
 * @file DrawingML React rendering module
 *
 * Re-exports format-agnostic components from @oxen-renderer/drawing-ml
 * for backwards compatibility.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

// =============================================================================
// Re-export from @oxen-renderer/drawing-ml
// =============================================================================

// Context
export {
  DrawingMLProvider,
  DrawingMLContext,
  useDrawingMLContext,
  useOptionalDrawingMLContext,
  type DrawingMLProviderProps,
  type DrawingMLRenderContext,
  type SvgDefsManager,
  type WarningCollector,
  type RenderSize,
} from "@oxen-renderer/drawing-ml";

// Hooks
export {
  useSvgDefs,
  SvgDefsProvider,
  SvgDefsCollector,
  LinearGradientDef,
  RadialGradientDef,
  SvgPatternDef,
  ClipPathDef,
} from "@oxen-renderer/drawing-ml";

// Color
export {
  useColor,
  resolveColorForReact,
  ColorSwatch,
  ColorSwatchRow,
  type ResolvedColorResult,
  type ColorSwatchProps,
  type ColorSwatchRowProps,
} from "@oxen-renderer/drawing-ml";

// Fill
export {
  PatternDef,
  usePatternFill,
  resolvePatternFillForReact,
  getPatternGeometry,
  isPatternSupported,
  getSupportedPatterns,
  type PatternDefProps,
  type PatternFillResult,
} from "@oxen-renderer/drawing-ml";

// Primitives
export {
  useFillWithDefs,
  resolveFillForReact,
  resolvedFillToResult,
  useStroke,
  resolveStrokeForReact,
  resolvedLineToProps,
  combineShapeProps,
  type SvgFillProps,
  type FillResult,
  type FillWithDefsResult,
  type SvgStrokeProps,
} from "@oxen-renderer/drawing-ml";

// Gradient
export {
  ooxmlAngleToSvgLinearGradient,
  fillToRectToRadialCenter,
  getRadialGradientCoords,
  type LinearGradientCoords,
  type RadialGradientCoords,
} from "@oxen-renderer/drawing-ml";

// Effects
export {
  ShadowFilterDef,
  GlowFilterDef,
  SoftEdgeFilterDef,
  EffectsFilter,
  EffectsWrapper,
  EffectsFilterDef,
  useEffects,
  resolveEffectsForReact,
  resolveShadowProps,
  resolveGlowProps,
  directionToOffset,
  type ShadowFilterDefProps,
  type GlowFilterDefProps,
  type SoftEdgeFilterDefProps,
  type EffectsResult,
  type ShadowAlignment,
  type ResolvedShadowProps,
  type ResolvedGlowProps,
} from "@oxen-renderer/drawing-ml";

// Re-export effect types from ooxml via drawing-ml
export type {
  Effects,
  ShadowEffect,
  GlowEffect,
  SoftEdgeEffect,
  ReflectionEffect,
} from "@oxen-renderer/drawing-ml";

// Background
export {
  useBackground,
  resolveBackgroundForReact,
  BackgroundFill,
  BackgroundFillWithDefs,
  type BackgroundResult,
} from "@oxen-renderer/drawing-ml";

// Shape
export {
  useShapeStyle,
  StyledShape,
  StyledShapeWithStyle,
  type ShapeStyleInput,
  type ShapeStyleResult,
  type ShapeSvgProps,
  type ShapeType,
} from "@oxen-renderer/drawing-ml";

// Text Fill
export {
  createTextGradientDef,
  createTextPatternDef,
  createTextImageFillDef,
  getTextPatternSize,
  renderTextPatternContent,
  type TextGradientDefProps,
  type TextFillConfig,
  type TextGradientFillConfig,
  type TextGradientStop,
  type TextSolidFillConfig,
  type TextNoFillConfig,
  type TextPatternFillConfig,
  type TextImageFillConfig,
} from "@oxen-renderer/drawing-ml";

// Text Effects
export {
  createTextEffectsFilterDef,
  type TextEffectsConfig,
  type TextShadowConfig,
  type TextGlowConfig,
  type TextSoftEdgeConfig,
  type TextReflectionConfig,
} from "@oxen-renderer/drawing-ml";

// Text 3D - includes PPTX-specific render3dTextEffects
export {
  render3dTextEffects,
  renderTextExtrusion,
  createTextBevelFilterDef,
  getExtrusionOffset,
  getBevelOffsets,
  type BevelConfig,
} from "./text-3d";
