/**
 * @file Builder module exports
 */

export { compress, compressDeflate, compressZstd } from "./compress";
export { buildFigHeader, buildFigFile } from "./header";
export { createTextSchema, TEXT_SCHEMA_INDICES } from "./text-schema";
export {
  TextNodeBuilder,
  FrameNodeBuilder,
  textNode,
  frameNode,
  // Default values (Figma's "Auto")
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_AUTO_RESIZE,
  DEFAULT_SVG_EXPORT_SETTINGS,
  // Text types
  type TextNodeData,
  type FrameNodeData,
  type TextAlignHorizontal,
  type TextAlignVertical,
  type TextAutoResize,
  type TextDecoration,
  type TextCase,
  type NumberUnits,
  type ValueWithUnits,
  // AutoLayout types
  type StackMode,
  type StackAlign,
  type StackPositioning,
  type StackSizing,
  type ConstraintType,
  type StackPadding,
  // Common types
  type Color,
  type Paint,
  type FontName,
  // Export settings types
  type ExportSettings,
  type ImageType,
  type ExportConstraintType,
  type ExportColorProfile,
  type ExportSVGIDMode,
} from "./text-builder";

// Symbol and Instance builders
export {
  SymbolNodeBuilder,
  InstanceNodeBuilder,
  symbolNode,
  instanceNode,
  type SymbolNodeData,
  type InstanceNodeData,
} from "./symbol-builder";

// Effect builders
export {
  // Builders
  DropShadowBuilder,
  InnerShadowBuilder,
  LayerBlurBuilder,
  BackgroundBlurBuilder,
  // Factory functions
  dropShadow,
  innerShadow,
  layerBlur,
  backgroundBlur,
  effects,
  // Constants
  EFFECT_TYPE_VALUES,
  // Types
  type EffectType,
  type EffectData,
  type ShadowEffectData,
  type BlurEffectData,
  type BaseEffectData,
} from "./effect-builder";

// Paint builders
export {
  // Builders
  SolidPaintBuilder,
  LinearGradientBuilder,
  RadialGradientBuilder,
  AngularGradientBuilder,
  DiamondGradientBuilder,
  ImagePaintBuilder,
  StrokeBuilder,
  // Factory functions
  solidPaint,
  solidPaintHex,
  linearGradient,
  radialGradient,
  angularGradient,
  diamondGradient,
  imagePaint,
  stroke,
  // Constants
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  SCALE_MODE_VALUES,
  // Types
  type GradientStop,
  type GradientHandles,
  type GradientPaint,
  type ImagePaint,
  type StrokeData,
  type PaintType,
  type ScaleMode,
  type BlendMode,
} from "./paint-builder";

// Shape builders
export {
  // Builders
  EllipseNodeBuilder,
  LineNodeBuilder,
  StarNodeBuilder,
  PolygonNodeBuilder,
  VectorNodeBuilder,
  RoundedRectangleNodeBuilder,
  // Factory functions
  ellipseNode,
  lineNode,
  starNode,
  polygonNode,
  vectorNode,
  roundedRectNode,
  // Constants
  SHAPE_NODE_TYPES,
  // Types
  type EllipseNodeData,
  type LineNodeData,
  type StarNodeData,
  type PolygonNodeData,
  type VectorNodeData,
  type RoundedRectangleNodeData,
  type BaseShapeNodeData,
  type ArcData,
  type Stroke,
  type StrokeCap,
  type StrokeJoin,
  type StrokeAlign,
  type WindingRule,
} from "./shape-builder";

export { FigFileBuilder, createFigFile } from "./fig-builder";

// Roundtrip editing (load → modify → save)
export {
  loadFigFile,
  saveFigFile,
  cloneFigFile,
  addNodeChange,
  findNodeByName,
  findNodesByType,
  type LoadedFigFile,
  type FigMetadata,
  type FigImage,
  type FigBlob,
  type SaveFigOptions,
} from "./fig-roundtrip";
