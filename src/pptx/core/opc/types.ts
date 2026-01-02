/**
 * @file Open Packaging Conventions (OPC) type definitions
 *
 * Types for ECMA-376 Part 2 structures:
 * - Content types ([Content_Types].xml)
 * - Relationships (.rels files)
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

/**
 * Slide file info extracted from content types
 *
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */
export type SlideFileInfo = {
  /** Full path to slide XML (e.g., "ppt/slides/slide1.xml") */
  path: string;
  /** Slide number (1-based) */
  number: number;
  /** Filename without extension (e.g., "slide1") */
  filename: string;
};

/**
 * Resource object from relationships
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type ResourceObject = {
  type: string;
  target: string;
};

/**
 * Slide relationship mapping (rId → resource)
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type SlideResources = Record<string, ResourceObject>;
