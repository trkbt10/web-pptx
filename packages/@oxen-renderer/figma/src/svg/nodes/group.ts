/**
 * @file Group node renderer
 */

import type { FigNode, FigMatrix } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";

// =============================================================================
// Group Node
// =============================================================================

/**
 * Extract group properties from a Figma node
 */
function extractGroupProps(node: FigNode): {
  transform: FigMatrix | undefined;
  opacity: number;
  visible: boolean;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    transform: nodeData.transform as FigMatrix | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
    visible: (nodeData.visible as boolean) ?? true,
  };
}

/**
 * Render a GROUP node to SVG
 *
 * @param node - The group node
 * @param ctx - Render context
 * @param renderedChildren - Pre-rendered children SVG strings
 */
export function renderGroupNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  renderedChildren: readonly SvgString[]
): SvgString {
  const { transform, opacity, visible } = extractGroupProps(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...renderedChildren
  );
}
