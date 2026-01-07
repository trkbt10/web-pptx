/**
 * @file Open Packaging Conventions (OPC) utilities
 *
 * Consolidated OPC module for ECMA-376 Part 2 structures:
 * - Pack URI and Part Name primitives
 * - [Content_Types].xml parsing
 * - Relationship types and utilities
 * - MIME type and data URL utilities
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// =============================================================================
// ECMA-376 Part 2 Primitives
// =============================================================================

export * from "./pack-uri";
export * from "./part-name";

// =============================================================================
// Content Types
// =============================================================================

export {
  CONTENT_TYPES,
  parseContentTypes,
  extractSlideNumber,
  getRelationshipPath,
  buildSlideFileInfoList,
} from "./content-types";

export type { SlideFileInfo } from "./content-types";

// =============================================================================
// Relationships (Re-exported from domain and parser)
// =============================================================================

// Relationship type constants
export { RELATIONSHIP_TYPES } from "../domain/relationships";

// Relationship type utilities
export {
  isImageRelationship,
  isHyperlinkRelationship,
  isMediaRelationship,
  createEmptyResourceMap,
} from "../domain/relationships";

// Finder functions (re-exported from parser for convenience)
export {
  findLayoutPath,
  findMasterPath,
  findThemePath,
  findDiagramDrawingPath,
  findImagePaths,
} from "../parser/relationships";

// Legacy aliases for backward compatibility
export {
  findLayoutPath as findLayoutFilename,
  findMasterPath as findMasterFilename,
  findThemePath as findThemeFilename,
  findDiagramDrawingPath as findDiagramDrawingFilename,
} from "../parser/relationships";

export {
  isImageRelationship as isImageType,
  isHyperlinkRelationship as isHyperlinkType,
} from "../domain/relationships";

// =============================================================================
// Utilities
// =============================================================================

export {
  getMimeTypeFromPath,
  arrayBufferToBase64,
  createDataUrl,
} from "./utils";

// =============================================================================
// Re-export Domain Types (Canonical Source)
// =============================================================================

export type { ResourceMap, ZipFile, ZipEntry, PlaceholderTable } from "../domain/opc";
