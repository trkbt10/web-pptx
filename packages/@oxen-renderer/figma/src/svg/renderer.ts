/**
 * @file Main SVG renderer for Figma nodes
 */

import type { FigNode, FigNodeType, FigMatrix } from "@oxen/fig/types";
import type { FigBlob, FigImage } from "@oxen/fig/parser";
import type { FigSvgRenderContext, FigSvgRenderResult } from "../types";
import { createFigSvgRenderContext } from "./context";
import { svg, defs, g, rect, mask, type SvgString, EMPTY_SVG } from "./primitives";
import {
  renderFrameNode,
  renderGroupNode,
  renderRectangleNode,
  renderEllipseNode,
  renderVectorNode,
  renderTextNode,
} from "./nodes";

// =============================================================================
// Transform Normalization
// =============================================================================

/**
 * Get the root frame's transform offset (translation component)
 */
function getRootFrameOffset(nodes: readonly FigNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  // Find the minimum x and y from all root node transforms
  let minX = Infinity;
  let minY = Infinity;

  for (const node of nodes) {
    const nodeData = node as Record<string, unknown>;
    const transform = nodeData.transform as FigMatrix | undefined;
    if (transform) {
      minX = Math.min(minX, transform.m02 ?? 0);
      minY = Math.min(minY, transform.m12 ?? 0);
    }
  }

  return {
    x: isFinite(minX) ? minX : 0,
    y: isFinite(minY) ? minY : 0,
  };
}

/**
 * Normalize node transform by removing the root offset
 */
function normalizeNodeTransform(node: FigNode, offset: { x: number; y: number }): FigNode {
  if (offset.x === 0 && offset.y === 0) {
    return node;
  }

  const nodeData = node as Record<string, unknown>;
  const transform = nodeData.transform as FigMatrix | undefined;

  if (!transform) {
    return node;
  }

  // Create a new node with normalized transform
  return {
    ...node,
    transform: {
      ...transform,
      m02: (transform.m02 ?? 0) - offset.x,
      m12: (transform.m12 ?? 0) - offset.y,
    },
  } as FigNode;
}

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
  /** Blobs from parsed .fig file for path decoding */
  readonly blobs?: readonly FigBlob[];
  /** Images from parsed .fig file for image fills */
  readonly images?: ReadonlyMap<string, FigImage>;
  /** Normalize root transform to (0, 0) - useful when rendering a single frame */
  readonly normalizeRootTransform?: boolean;
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
    blobs: options?.blobs ?? [],
    images: options?.images ?? new Map(),
  });

  const warnings: string[] = [];

  // Normalize root transforms if requested
  let nodesToRender = nodes;
  if (options?.normalizeRootTransform) {
    const offset = getRootFrameOffset(nodes);
    nodesToRender = nodes.map((node) => normalizeNodeTransform(node, offset));
  }

  // Render all nodes
  const renderedNodes = nodesToRender.map((node) => {
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
 * Check if a node is a mask layer
 */
function isMaskNode(node: FigNode): boolean {
  const nodeData = node as Record<string, unknown>;
  return nodeData.mask === true;
}

/**
 * Process children with mask support
 *
 * When a child has mask: true, it becomes a mask for subsequent siblings.
 * The mask node itself is not rendered as visible content.
 */
function renderChildrenWithMasks(
  children: readonly FigNode[],
  ctx: FigSvgRenderContext,
  warnings: string[]
): readonly SvgString[] {
  const result: SvgString[] = [];
  let currentMaskId: string | null = null;
  let maskedContent: SvgString[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const nodeData = child as Record<string, unknown>;

    // Skip invisible nodes
    if (nodeData.visible === false) {
      continue;
    }

    if (isMaskNode(child)) {
      // If we have accumulated masked content, flush it
      if (currentMaskId && maskedContent.length > 0) {
        result.push(g({ mask: `url(#${currentMaskId})` }, ...maskedContent));
        maskedContent = [];
      }

      // Render the mask node content
      const maskContent = renderNode(child, ctx, warnings);
      if (maskContent !== EMPTY_SVG) {
        // Create mask definition
        currentMaskId = ctx.defs.generateId("mask");
        const maskDef = mask(
          { id: currentMaskId, style: "mask-type:luminance" },
          // Use white fill for luminance mask
          g({ fill: "white" }, maskContent)
        );
        ctx.defs.add(maskDef);
      }
    } else {
      // Regular node
      const rendered = renderNode(child, ctx, warnings);
      if (rendered !== EMPTY_SVG) {
        if (currentMaskId) {
          // Accumulate content for masking
          maskedContent.push(rendered);
        } else {
          // No mask active, render directly
          result.push(rendered);
        }
      }
    }
  }

  // Flush remaining masked content
  if (currentMaskId && maskedContent.length > 0) {
    result.push(g({ mask: `url(#${currentMaskId})` }, ...maskedContent));
  }

  return result;
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

  // Render children with mask support for container nodes
  const children = node.children ?? [];
  const renderedChildren = renderChildrenWithMasks(children, ctx, warnings);

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
    case "SYMBOL":
      return renderFrameNode(node, ctx, renderedChildren);

    case "GROUP":
    case "BOOLEAN_OPERATION":
      return renderGroupNode(node, ctx, renderedChildren);

    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
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
    // Normalize root transforms by default when rendering a canvas
    normalizeRootTransform: options?.normalizeRootTransform ?? true,
  });
}
