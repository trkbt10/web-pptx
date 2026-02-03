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
  type TextNodeData,
  type FrameNodeData,
  type TextAlignHorizontal,
  type TextAlignVertical,
  type TextAutoResize,
  type TextDecoration,
  type TextCase,
  type NumberUnits,
  type ValueWithUnits,
  // Export settings types
  type ExportSettings,
  type ImageType,
  type ExportConstraintType,
  type ExportColorProfile,
  type ExportSVGIDMode,
} from "./text-builder";
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
