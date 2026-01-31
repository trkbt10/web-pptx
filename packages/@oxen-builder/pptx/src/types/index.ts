/**
 * @file Type definitions for PPTX builder
 *
 * This module provides type definitions for build specifications.
 */

// Spec types for building PPTX presentations
export {
  // Type guard
  isThemeColor,
  // Line types
  type LineEndSpec,
  // Color types
  type ThemeColorSpec,
  type ColorSpec,
  // Fill types
  type GradientStopSpec,
  type GradientFillSpec,
  type PatternFillSpec,
  type SolidFillSpec,
  type ThemeFillSpec,
  type FillSpec,
  // Effect types
  type ShadowEffectSpec,
  type GlowEffectSpec,
  type SoftEdgeEffectSpec,
  type ReflectionEffectSpec,
  type EffectsSpec,
  // 3D types
  type BevelSpec,
  type Shape3dSpec,
  // Text types
  type TextVerticalPosition,
  type BulletType,
  type BulletSpec,
  type TextEffectSpec,
  type TextOutlineSpec,
  type HyperlinkSpec,
  type TextRunSpec,
  type LineSpacingSpec,
  type TextParagraphSpec,
  type RichTextSpec,
  type TextSpec,
  type TextWrapping,
  type TextBodyPropertiesSpec,
  // Shape types
  type PlaceholderSpec,
  type ShapeSpec,
  // Custom geometry types
  type CustomGeometrySpec,
  type GeometryPathFillMode,
  type GeometryPathSpec,
  type MoveToSpec,
  type LineToSpec,
  type ArcToSpec,
  type QuadBezierToSpec,
  type CubicBezierToSpec,
  type CloseSpec,
  type PathCommandSpec,
  // Blip effects types
  type BlipEffectSpec,
  // Image/media types
  type ImageSpec,
  type MediaEmbedSpec,
  // Connector types
  type ConnectorSpec,
  // Group types
  type GroupSpec,
  // Table types (new tables)
  type TableCellSpec,
  type TableSpec,
  // Table update types (existing tables)
  type TableTextRunSpec,
  type TableParagraphSpec,
  type TableTextBodySpec,
  type TableCellUpdateSpec,
  type TableRowAddSpec,
  type TableColumnAddSpec,
  type TableUpdateSpec,
  // Chart types
  type ChartSeriesSpec,
  type ChartDataSpec,
  type ChartTransformSpec,
  type ChartUpdateSpec,
  type ChartOptionsSpec,
  type ChartAddSpec,
  // Background types
  type BackgroundSolidSpec,
  type BackgroundGradientSpec,
  type BackgroundImageSpec,
  type BackgroundFillSpec,
  // Transition types
  type SlideTransitionSpec,
  // Animation types
  type AnimationClassSpec,
  type AnimationSpec,
  // Comment/Notes types
  type CommentSpec,
  type NotesSpec,
  // Diagram types
  type DiagramNodeTextUpdateSpec,
  type DiagramNodeAddSpec,
  type DiagramNodeRemoveSpec,
  type DiagramConnectionSpec,
  type DiagramChangeSpec,
  type SmartArtUpdateSpec,
  // Slide types
  type SlideModSpec,
  // Note: SlideAddSpec, SlideRemoveSpec, SlideReorderSpec, SlideDuplicateSpec
  // are exported from slide-ops module to avoid duplicate exports
  // Build types
  type BuildSpec,
  type BuildData,
  // Theme types
  type ThemeSchemeColorName,
  type ThemeColorSchemeEditSpec,
  type ThemeFontSpec,
  type ThemeFontSchemeEditSpec,
  type ThemeEditSpec,
} from "./spec-types";
