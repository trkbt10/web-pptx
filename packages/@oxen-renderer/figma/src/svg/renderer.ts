/**
 * @file Main SVG renderer for Figma nodes
 */

import type { FigNode, FigNodeType } from "@oxen/fig/types";
import type { FigSvgRenderContext, FigSvgRenderResult } from "../types";
import { createFigSvgRenderContext } from "./context";
import { svg, defs, g, rect, type SvgString, EMPTY_SVG } from "./primitives";
import {
  renderFrameNode,
  renderGroupNode,
  renderRectangleNode,
  renderEllipseNode,
  renderVectorNode,
  renderTextNode,
} from "./nodes";

// =============================================================================
// Render Options
// =============================================================================

/**
 * Options for rendering Figma nodes to SVG
 */
export type FigSvgRenderOptions = {
  /** Width of the output SVG */
  readonly width?: number;
  /** Height of the output SVG */
  readonly height?: number;
  /** Background color (CSS color string) */
  readonly backgroundColor?: string;
};

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Render Figma nodes to SVG
 *
 * @param nodes - Array of Figma nodes to render
 * @param options - Render options
 * @returns SVG render result with warnings
 */
export function renderFigToSvg(
  nodes: readonly FigNode[],
  options?: FigSvgRenderOptions
): FigSvgRenderResult {
  const width = options?.width ?? 800;
  const height = options?.height ?? 600;

  const ctx = createFigSvgRenderContext({
    canvasSize: { width, height },
  });

  const warnings: string[] = [];

  // Render all nodes
  const renderedNodes = nodes.map((node) => {
    try {
      return renderNode(node, ctx, warnings);
    } catch (error) {
      warnings.push(`Failed to render node "${node.name ?? "unknown"}": ${error}`);
      return EMPTY_SVG;
    }
  });

  // Build final SVG
  const content: SvgString[] = [];

  // Add defs if any
  if (ctx.defs.hasAny()) {
    content.push(defs(...(ctx.defs.getAll() as SvgString[])));
  }

  // Add background if specified
  if (options?.backgroundColor) {
    content.push(
      rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: options.backgroundColor,
      })
    );
  }

  // Add rendered nodes
  content.push(...renderedNodes);

  const svgOutput = svg(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    ...content
  );

  return {
    svg: svgOutput,
    warnings,
  };
}

/**
 * Render a single Figma node to SVG
 *
 * @param node - The Figma node to render
 * @param ctx - Render context
 * @param warnings - Array to collect warnings
 * @returns SVG string for the node
 */
function renderNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  warnings: string[]
): SvgString {
  const nodeType = getNodeType(node);

  // Check visibility
  const nodeData = node as Record<string, unknown>;
  if (nodeData.visible === false) {
    return EMPTY_SVG;
  }

  // Render children first for container nodes
  const children = node.children ?? [];
  const renderedChildren = children.map((child) => renderNode(child, ctx, warnings));

  switch (nodeType) {
    case "DOCUMENT":
      // Document is just a container
      return g({}, ...renderedChildren);

    case "CANVAS":
      // Canvas (page) is just a container
      return g({}, ...renderedChildren);

    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
      return renderFrameNode(node, ctx, renderedChildren);

    case "GROUP":
    case "BOOLEAN_OPERATION":
      return renderGroupNode(node, ctx, renderedChildren);

    case "RECTANGLE":
      return renderRectangleNode(node, ctx);

    case "ELLIPSE":
      return renderEllipseNode(node, ctx);

    case "VECTOR":
    case "LINE":
    case "STAR":
    case "REGULAR_POLYGON":
      return renderVectorNode(node, ctx);

    case "TEXT":
      return renderTextNode(node, ctx);

    default:
      // Unknown node type - render children if any
      if (renderedChildren.length > 0) {
        return g({}, ...renderedChildren);
      }
      warnings.push(`Unknown node type: ${nodeType}`);
      return EMPTY_SVG;
  }
}

/**
 * Get the node type from a Figma node
 */
function getNodeType(node: FigNode): FigNodeType | string {
  // Type can be a string or an enum object with value/name
  const nodeData = node as Record<string, unknown>;
  const type = nodeData.type;

  if (typeof type === "string") {
    return type;
  }

  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }

  return "UNKNOWN";
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Calculate canvas bounds from children
 */
function calculateCanvasBounds(
  children: readonly FigNode[],
  defaultWidth: number,
  defaultHeight: number
): { width: number; height: number } {
  const bounds = children.reduce(
    (acc, child) => {
      const childData = child as Record<string, unknown>;
      const transform = childData.transform as { m02?: number; m12?: number } | undefined;
      const size = childData.size as { x?: number; y?: number } | undefined;

      if (transform && size) {
        const right = (transform.m02 ?? 0) + (size.x ?? 0);
        const bottom = (transform.m12 ?? 0) + (size.y ?? 0);
        return {
          width: Math.max(acc.width, right),
          height: Math.max(acc.height, bottom),
        };
      }
      return acc;
    },
    { width: defaultWidth, height: defaultHeight }
  );

  return bounds;
}

/**
 * Render a single canvas (page) from Figma nodes
 */
export function renderCanvas(
  canvasNode: FigNode,
  options?: FigSvgRenderOptions
): FigSvgRenderResult {
  const children = canvasNode.children ?? [];

  // Try to determine canvas bounds from children
  const defaultWidth = options?.width ?? 800;
  const defaultHeight = options?.height ?? 600;
  const bounds = calculateCanvasBounds(children, defaultWidth, defaultHeight);

  return renderFigToSvg(children, {
    ...options,
    width: options?.width ?? bounds.width,
    height: options?.height ?? bounds.height,
  });
}
