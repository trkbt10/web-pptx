/**
 * @file Figma renderer package entry point
 *
 * This package provides SVG rendering for Figma nodes.
 *
 * For parsing .fig files, import from @oxen/fig/parser:
 *   import { parseFigFile, parseFigFileSync } from "@oxen/fig/parser";
 *
 * For Figma types (FigNodeType, FigMatrix, FigColor, etc.), import from @oxen/fig/types:
 *   import type { FigNodeType, FigMatrix, FigColor } from "@oxen/fig/types";
 */

// =============================================================================
// Renderer-specific types
// =============================================================================

export type {
  DefsCollector,
  FigSvgRenderContext,
  FigSvgRenderContextConfig,
  FigSvgRenderResult,
} from "./types";
