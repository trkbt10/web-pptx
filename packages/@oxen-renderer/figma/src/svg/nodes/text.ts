/**
 * @file Text node renderer
 */

import type { FigNode, FigMatrix, FigPaint, FigColor } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { text, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { figColorToHex } from "../fill";

// =============================================================================
// Text Style Types
// =============================================================================

/**
 * Figma text style
 */
type FigTextStyle = {
  readonly fontFamily?: string;
  readonly fontWeight?: number;
  readonly fontSize?: number;
  readonly letterSpacing?: number;
  readonly lineHeight?: number | { unit: string; value: number };
  readonly italic?: boolean;
};

// =============================================================================
// Text Node
// =============================================================================

/**
 * Extract text properties from a Figma node
 */
function extractTextProps(node: FigNode): {
  transform: FigMatrix | undefined;
  characters: string;
  style: FigTextStyle | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    transform: nodeData.transform as FigMatrix | undefined,
    characters: (nodeData.characters as string) ?? "",
    style: nodeData.style as FigTextStyle | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Get fill color from paints
 */
function getFillColor(paints: readonly FigPaint[] | undefined): string {
  if (!paints || paints.length === 0) {
    return "#000000";
  }
  const firstPaint = paints.find((p) => p.visible !== false);
  if (firstPaint && firstPaint.type === "SOLID") {
    const solidPaint = firstPaint as FigPaint & { color: FigColor };
    return figColorToHex(solidPaint.color);
  }
  return "#000000";
}

/**
 * Get line height from style
 */
function getLineHeight(style: FigTextStyle | undefined): number {
  if (!style) {
    return 20;
  }

  if (typeof style.lineHeight === "number") {
    return style.lineHeight;
  }

  if (style.lineHeight && style.lineHeight.unit === "PIXELS") {
    return style.lineHeight.value;
  }

  // Default: 1.2 * fontSize
  return (style.fontSize ?? 16) * 1.2;
}

/**
 * Build text attributes
 */
function buildTextAttrs(
  style: FigTextStyle | undefined,
  fillColor: string
): Parameters<typeof text>[0] {
  return {
    x: 0,
    y: style?.fontSize ?? 16, // Baseline offset
    fill: fillColor,
    "font-family": style?.fontFamily ?? "sans-serif",
    "font-size": style?.fontSize ?? 16,
    "font-weight": style?.fontWeight,
    "font-style": style?.italic ? "italic" : undefined,
    "letter-spacing": style?.letterSpacing,
  };
}

/**
 * Render a TEXT node to SVG
 */
export function renderTextNode(
  node: FigNode,
  _ctx: FigSvgRenderContext
): SvgString {
  const { transform, characters, style, fillPaints, opacity } = extractTextProps(node);

  if (!characters) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const fillColor = getFillColor(fillPaints);
  const textAttrs = buildTextAttrs(style, fillColor);

  // Handle multiline text
  const lines = characters.split("\n");

  if (lines.length === 1) {
    // Single line
    const textEl = text(textAttrs, characters);
    if (transformStr || opacity < 1) {
      return g(
        {
          transform: transformStr || undefined,
          opacity: opacity < 1 ? opacity : undefined,
        },
        textEl
      );
    }
    return textEl;
  }

  // Multiline - render each line
  const lineHeight = getLineHeight(style);
  const textElements: SvgString[] = lines.map((lineText, i) =>
    text(
      {
        ...textAttrs,
        y: (textAttrs.y as number) + i * lineHeight,
      },
      lineText
    )
  );

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...textElements
  );
}
