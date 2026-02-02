/**
 * @file Figma renderer types (renderer-specific only)
 */

// =============================================================================
// SVG Render Context
// =============================================================================

/**
 * SVG defs collector for gradients, patterns, clip paths
 */
export type DefsCollector = {
  /** Add a def element (raw SVG string) */
  readonly add: (def: string) => void;
  /** Generate unique ID for a def */
  readonly generateId: (prefix: string) => string;
  /** Get all collected defs */
  readonly getAll: () => readonly string[];
  /** Check if any defs were collected */
  readonly hasAny: () => boolean;
};

/**
 * SVG render context for Figma nodes
 */
export type FigSvgRenderContext = {
  /** Defs collector for gradients, patterns, etc. */
  readonly defs: DefsCollector;
  /** Canvas size for viewport */
  readonly canvasSize: { width: number; height: number };
};

/**
 * Configuration for creating SVG render context
 */
export type FigSvgRenderContextConfig = {
  readonly canvasSize?: { width: number; height: number };
};

/**
 * SVG render result
 */
export type FigSvgRenderResult = {
  /** Generated SVG string */
  readonly svg: string;
  /** Warnings generated during rendering */
  readonly warnings: readonly string[];
};
