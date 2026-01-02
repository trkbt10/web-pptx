/**
 * @file Open Packaging Conventions (OPC) utilities
 *
 * Parsing and processing for ECMA-376 Part 2 (OPC) structures:
 * - [Content_Types].xml
 * - .rels relationship files
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// Types
export type { SlideFileInfo, ResourceObject, SlideResources } from "./types";

// Content types parsing
export {
  CONTENT_TYPES,
  RELATIONSHIP_TYPES,
  parseContentTypes,
  extractSlideNumber,
  getRelationshipPath,
  buildSlideFileInfoList,
} from "./content-types";

// Relationship parsing
export {
  parseRelationships,
  findLayoutFilename,
  findMasterFilename,
  findThemeFilename,
  findDiagramDrawingFilename,
  getResourceById,
  getResourcesByType,
  isImageResource,
  isHyperlinkResource,
} from "./relationships";

// Utility functions
export {
  getMimeTypeFromPath,
  arrayBufferToBase64,
  createDataUrl,
  resolveRelativePath,
  normalizePath,
} from "./utils";
