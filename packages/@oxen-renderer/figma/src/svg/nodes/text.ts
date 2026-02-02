/**
 * @file Text node renderer
 */

import type { FigNode, FigMatrix, FigPaint, FigColor } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { text, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { figColorToHex, getPaintType, isPlaceholderColor } from "../fill";

// =============================================================================
// Text Style Types
// =============================================================================

/**
 * Font name structure from .fig files
 */
type FigFontName = {
  readonly family?: string;
  readonly style?: string;
  readonly postscript?: string;
};

/**
 * Value with units structure
 */
type FigValueWithUnits = {
  readonly value: number;
  readonly units?: { value: number; name: string } | string;
};

/**
 * Text data structure from .fig files
 */
type FigTextData = {
  readonly characters?: string;
  readonly lines?: readonly unknown[];
};

/**
 * Extracted text properties
 */
type ExtractedTextProps = {
  transform: FigMatrix | undefined;
  characters: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number | undefined;
  fontStyle: string | undefined;
  letterSpacing: number | undefined;
  lineHeight: number;
  fillPaints: readonly FigPaint[] | undefined;
  opacity: number;
};

/**
 * Font weight mapping rules
 */
const FONT_WEIGHT_RULES: ReadonlyArray<{ match: (s: string) => boolean; weight: number }> = [
  { match: (s) => s.includes("thin"), weight: 100 },
  { match: (s) => s.includes("extralight") || s.includes("extra light"), weight: 200 },
  { match: (s) => s.includes("light"), weight: 300 },
  { match: (s) => s.includes("regular") || s.includes("normal"), weight: 400 },
  { match: (s) => s.includes("medium"), weight: 500 },
  { match: (s) => s.includes("semibold") || s.includes("semi bold") || s.includes("demi"), weight: 600 },
  { match: (s) => s.includes("bold") && !s.includes("extra"), weight: 700 },
  { match: (s) => s.includes("extrabold") || s.includes("extra bold"), weight: 800 },
  { match: (s) => s.includes("black") || s.includes("heavy"), weight: 900 },
];

/**
 * Get font weight from font style string
 */
function getFontWeightFromStyle(style: string | undefined): number | undefined {
  if (!style) {
    return undefined;
  }
  const styleLower = style.toLowerCase();
  const rule = FONT_WEIGHT_RULES.find((r) => r.match(styleLower));
  return rule?.weight;
}

/**
 * Check if font style indicates italic
 */
function isItalicStyle(style: string | undefined): boolean {
  if (!style) {
    return false;
  }
  const styleLower = style.toLowerCase();
  return styleLower.includes("italic") || styleLower.includes("oblique");
}

/**
 * Get numeric value from value-with-units structure
 */
function getValueWithUnits(val: unknown, defaultValue: number, fontSize?: number): number {
  if (typeof val === "number") {
    return val;
  }
  if (val && typeof val === "object" && "value" in val) {
    const vwu = val as FigValueWithUnits;
    const units = vwu.units;
    const unitsName = typeof units === "string" ? units : units?.name;

    if (unitsName === "PERCENT" && fontSize) {
      return (vwu.value / 100) * fontSize;
    }
    return vwu.value;
  }
  return defaultValue;
}

/**
 * Get characters from node data
 */
function getCharacters(nodeData: Record<string, unknown>): string | undefined {
  const characters = nodeData.characters as string | undefined;
  if (characters) {
    return characters;
  }
  const textData = nodeData.textData as FigTextData | undefined;
  return textData?.characters;
}

/**
 * Extract text properties from a Figma node
 */
function extractTextProps(node: FigNode): ExtractedTextProps {
  const nodeData = node as Record<string, unknown>;
  const characters = getCharacters(nodeData);

  // Font size - directly on node in .fig files
  const fontSize = (nodeData.fontSize as number) ?? 16;

  // Font name - has family/style in .fig files
  const fontName = nodeData.fontName as FigFontName | undefined;
  const fontFamily = fontName?.family ?? "sans-serif";
  const fontWeight = getFontWeightFromStyle(fontName?.style);
  const fontStyle = isItalicStyle(fontName?.style) ? "italic" : undefined;

  // Letter spacing
  const letterSpacing = getValueWithUnits(nodeData.letterSpacing, 0, fontSize);

  // Line height
  const lineHeight = getValueWithUnits(nodeData.lineHeight, fontSize * 1.2, fontSize);

  return {
    transform: nodeData.transform as FigMatrix | undefined,
    characters: characters ?? "",
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    letterSpacing: letterSpacing !== 0 ? letterSpacing : undefined,
    lineHeight,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Get fill color and opacity from paints
 */
function getFillColorAndOpacity(paints: readonly FigPaint[] | undefined): { color: string; opacity: number } {
  if (!paints || paints.length === 0) {
    return { color: "#000000", opacity: 1 };
  }
  const firstPaint = paints.find((p) => p.visible !== false);
  if (firstPaint && getPaintType(firstPaint) === "SOLID") {
    const solidPaint = firstPaint as FigPaint & { color: FigColor };
    // Check for placeholder color (unresolved external style reference)
    if (isPlaceholderColor(solidPaint.color)) {
      return { color: "#000000", opacity: 1 }; // Default to black
    }
    return {
      color: figColorToHex(solidPaint.color),
      opacity: firstPaint.opacity ?? 1,
    };
  }
  return { color: "#000000", opacity: 1 };
}

/**
 * Build text attributes from extracted props
 */
function buildTextAttrs(
  props: ExtractedTextProps,
  fillColor: string,
  fillOpacity: number
): Parameters<typeof text>[0] {
  return {
    x: 0,
    y: props.fontSize, // Baseline offset
    fill: fillColor,
    "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
    "font-family": props.fontFamily,
    "font-size": props.fontSize,
    "font-weight": props.fontWeight,
    "font-style": props.fontStyle,
    "letter-spacing": props.letterSpacing,
  };
}

/**
 * Render a TEXT node to SVG
 */
export function renderTextNode(
  node: FigNode,
  _ctx: FigSvgRenderContext
): SvgString {
  const props = extractTextProps(node);

  if (!props.characters) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(props.transform);
  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);
  const textAttrs = buildTextAttrs(props, fillColor, fillOpacity);

  // Handle multiline text
  const lines = props.characters.split("\n");

  if (lines.length === 1) {
    // Single line
    const textEl = text(textAttrs, props.characters);
    if (transformStr || props.opacity < 1) {
      return g(
        {
          transform: transformStr || undefined,
          opacity: props.opacity < 1 ? props.opacity : undefined,
        },
        textEl
      );
    }
    return textEl;
  }

  // Multiline - render each line
  const textElements: SvgString[] = lines.map((lineText, i) =>
    text(
      {
        ...textAttrs,
        y: props.fontSize + i * props.lineHeight,
      },
      lineText
    )
  );

  return g(
    {
      transform: transformStr || undefined,
      opacity: props.opacity < 1 ? props.opacity : undefined,
    },
    ...textElements
  );
}
