/**
 * @file Office Text Layout Module
 *
 * Unified text layout engine for PPTX and DOCX.
 * Provides shared text measurement, line breaking, and layout capabilities.
 */

// Types
export type {
  // Alignment
  TextAlign,
  TextAnchor,
  LineSpacing,
  // Span types
  TextFillConfig,
  TextOutlineConfig,
  LayoutSpan,
  MeasuredSpan,
  PositionedSpan,
  // Paragraph types
  BulletConfig,
  LayoutTabStop,
  FontAlignment,
  LayoutParagraphInput,
  // Layout results
  LayoutLine,
  LayoutParagraphResult,
  LayoutResult,
  // Text box config
  TextWrapping,
  TextOverflow,
  TextVerticalOverflow,
  AutoFitConfig,
  TextBoxConfig,
  // Layout input
  MeasuredParagraph,
  LayoutInput,
  // Continuous document types
  PageLayout,
  PagedLayoutResult,
  ContinuousCursorPosition,
  ContinuousSelection,
  CursorCoordinates,
  SelectionRect,
} from "./types";

// Measurer
export {
  PT_TO_PX,
  calculateCharWidth,
  estimateTextWidth,
  measureSpan,
  measureSpans,
  estimateBulletWidth,
  measureTextDetailed,
  measureSpanTextWidth,
  getCharIndexAtOffset,
} from "./measurer";
export type { CharWidthResult, DetailedMeasurement } from "./measurer";

// Line breaker
export {
  DEFAULT_FONT_SIZE_PT,
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./line-breaker";
export type { LineBreakResult, LineFontInfo } from "./line-breaker";

// Layout engine
export { layoutTextBody, layoutDocument } from "./engine";

// DOCX adapter
export {
  paragraphToLayoutInput,
  paragraphsToLayoutInputs,
  getParagraphPlainText,
  getDocumentPlainText,
  DEFAULT_PAGE_CONFIG,
  getContentWidth,
  getContentHeight,
} from "./adapters/docx-adapter";
export type { DocxPageConfig } from "./adapters/docx-adapter";

// SVG Renderer
export {
  TextOverlay,
  renderSelectionRects,
  renderCursor,
  CURSOR_ANIMATION_CSS,
} from "./renderers/svg-renderer";
export type { TextOverlayProps } from "./renderers/svg-renderer";

// Page Flow
export {
  flowIntoPages,
  createSinglePageLayout,
  DEFAULT_PAGE_FLOW_CONFIG,
} from "./page-flow";
export type { PageFlowConfig, PageBreakHint, PageFlowInput } from "./page-flow";
