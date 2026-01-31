/**
 * @file Element builders for PPTX construction
 *
 * This module provides builders for shapes, images, tables, charts, etc.
 */

// ID generation
export { generateShapeId } from "./id-generator";

// XML utilities
export { setChildren } from "./xml-utils";

// Preset shape mappings
export { PRESET_MAP } from "./presets";

// Fill builders
export {
  buildColor,
  buildFill,
  buildGradientFill,
  buildPatternFill,
  buildSolidFill,
  buildSolidFillFromSpec,
  buildThemeFill,
} from "./fill-builder";

// Line builders
export { buildLine, buildLineEnd, buildLineFromSpec } from "./line-builder";

// Effects builders
export { buildBevel, buildEffects, buildShape3d } from "./effects-builder";

// Text builders
export {
  buildParagraph,
  buildTextBody,
  buildTextRun,
  collectHyperlinks,
  type HyperlinkInfo,
} from "./text-builder";

// Blip effects builders
export { buildBlipEffectsFromSpec } from "./blip-effects-builder";

// Custom geometry builders
export { buildCustomGeometryFromSpec } from "./custom-geometry-builder";

// Media embed builders
export { buildMediaReferenceFromSpec, detectEmbeddedMediaType } from "./media-embed-builder";

// Background builders
export {
  applyBackground,
  applyImageBackground,
  isImageBackground,
} from "./background-builder";

// Animation builders
export { applyAnimations, type ApplyAnimationsResult } from "./animation-builder";

// Comment builders
export { applyComments } from "./comment-builder";

// Notes builders
export { applyNotes } from "./notes-builder";

// Transition builders
export { applySlideTransition, isTransitionType } from "./transition-builder";

// Theme builders
export { applyThemeEditsToPackage, applyThemeEditsToThemeXml } from "./theme-builder";

// Chart builders
export { applyChartUpdates } from "./chart-builder";

// Chart add builders
export { addChartsToSlide } from "./chart-add-builder";

// SmartArt builders
export { applySmartArtUpdates } from "./smartart-builder";

// Table update builders
export { applyTableUpdates, type ApplyTableUpdatesResult } from "./table-update-builder";

// Registry (main element builders)
export {
  // Context types
  type BuildContext,
  type BuildResult,
  type SyncBuilder,
  type AsyncBuilder,
  // Element builders
  shapeBuilder,
  imageBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  // Unified processing
  addElementsSync,
  addElementsAsync,
  type AddElementsSyncOptions,
  type AddElementsAsyncOptions,
} from "./registry";
