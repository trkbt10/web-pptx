/**
 * @file Path-based text rendering using opentype.js
 *
 * Converts text to SVG paths for pixel-perfect rendering.
 * This matches Figma's export behavior where text is outlined.
 */

import type { Font } from "opentype.js";
import type { FigNode } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../../types";
import { path, g, type SvgString, EMPTY_SVG } from "../../primitives";
import { buildTransformAttr } from "../../transform";
import { extractTextProps } from "./props";
import { getFillColorAndOpacity } from "./fill";
import { getAlignedX, getAlignedYWithMetrics } from "./alignment";
import type { FontLoader } from "./font/loader";
import type { ExtractedTextProps } from "./types";

/**
 * Path render context
 */
export type PathRenderContext = FigSvgRenderContext & {
  fontLoader: FontLoader;
};

/**
 * Check if text wrapping is needed
 */
function needsTextWrapping(props: ExtractedTextProps): boolean {
  return (
    props.textAutoResize !== "WIDTH_AND_HEIGHT" &&
    props.size !== undefined &&
    props.size.width > 0
  );
}

/**
 * Break text into lines based on width using opentype.js font metrics
 */
function breakTextWithFont(
  text: string,
  font: Font,
  fontSize: number,
  maxWidth: number,
  letterSpacing?: number
): readonly string[] {
  const scale = fontSize / font.unitsPerEm;
  const spacing = letterSpacing ?? 0;
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  const words = text.split(/(\s+)/); // Keep whitespace as separate items

  for (const word of words) {
    // Calculate word width
    let wordWidth = 0;
    for (let i = 0; i < word.length; i++) {
      const glyph = font.charToGlyph(word[i]);
      const advanceWidth = glyph.advanceWidth ?? 0;
      wordWidth += advanceWidth * scale;
      if (i < word.length - 1) {
        wordWidth += spacing;
      }
    }

    // Check if adding this word would exceed max width
    if (currentLine && currentWidth + wordWidth > maxWidth) {
      // Start new line
      lines.push(currentLine.trimEnd());
      currentLine = word.trimStart();
      // Recalculate width for trimmed word
      currentWidth = 0;
      for (let i = 0; i < currentLine.length; i++) {
        const glyph = font.charToGlyph(currentLine[i]);
        const advanceWidth = glyph.advanceWidth ?? 0;
        currentWidth += advanceWidth * scale;
        if (i < currentLine.length - 1) {
          currentWidth += spacing;
        }
      }
    } else {
      currentLine += word;
      currentWidth += wordWidth;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Get lines for path rendering with text wrapping support
 */
function getTextLinesForPath(
  props: ExtractedTextProps,
  font: Font
): readonly string[] {
  const characters = props.characters;
  const explicitLines = characters.split("\n");

  if (!needsTextWrapping(props)) {
    return explicitLines;
  }

  const maxWidth = props.size!.width;
  const allLines: string[] = [];

  for (const explicitLine of explicitLines) {
    if (!explicitLine) {
      allLines.push("");
      continue;
    }

    const brokenLines = breakTextWithFont(
      explicitLine,
      font,
      props.fontSize,
      maxWidth,
      props.letterSpacing
    );

    for (const line of brokenLines) {
      allLines.push(line);
    }
  }

  return allLines;
}

/**
 * Render text node as SVG path
 *
 * Uses opentype.js to convert text to paths.
 * Falls back to regular text rendering if font loading fails.
 */
export async function renderTextNodeAsPath(
  node: FigNode,
  ctx: PathRenderContext
): Promise<SvgString> {
  const props = extractTextProps(node);

  // Debug
  console.log(`[path-render] characters: "${props.characters}", fontSize: ${props.fontSize}, fontFamily: ${props.fontFamily}`);

  if (!props.characters) {
    return EMPTY_SVG;
  }

  // Try to load the font
  const loadedFont = await ctx.fontLoader.loadFont({
    family: props.fontFamily,
    weight: props.fontWeight,
    style: props.fontStyle === "italic" ? "italic" : "normal",
  });

  if (!loadedFont) {
    // Font not available - this will need fallback handling
    console.warn(`Font not found: ${props.fontFamily} ${props.fontWeight}`);
    return EMPTY_SVG;
  }

  // Debug
  console.log(`[path-render] loaded font: ${loadedFont.family}, weight: ${loadedFont.weight}, unitsPerEm: ${loadedFont.font.unitsPerEm}`);

  const transformStr = buildTransformAttr(props.transform);
  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);

  // Get font metrics for accurate baseline and line height calculation
  const font = loadedFont.font;
  const ascenderRatio = font.ascender / font.unitsPerEm;

  // Calculate the natural line height from font metrics
  // Figma's 100% line height = fontSize * (ascender + |descender|) / unitsPerEm
  const naturalLineHeight = props.fontSize * (font.ascender + Math.abs(font.descender)) / font.unitsPerEm;

  // If props.lineHeight equals fontSize, it was set to 100% in Figma
  // In that case, use the natural line height from font metrics
  const lineHeight = Math.abs(props.lineHeight - props.fontSize) < 0.01
    ? naturalLineHeight
    : props.lineHeight;

  // Get lines with text wrapping applied
  const lines = getTextLinesForPath(props, font);

  // Debug
  console.log(`[path-render] lines: ${JSON.stringify(lines)}, lineCount: ${lines.length}`);

  // Calculate text position using actual font metrics
  const x = getAlignedX(props.textAlignHorizontal, props.size?.width);
  const baseY = getAlignedYWithMetrics({
    align: props.textAlignVertical,
    height: props.size?.height,
    fontSize: props.fontSize,
    lineCount: lines.length,
    lineHeight,
    ascenderRatio,
  });

  // Debug
  console.log(`[path-render] baseY: ${baseY}, x: ${x}, ascenderRatio: ${ascenderRatio}, lineHeight: ${lineHeight}, naturalLineHeight: ${naturalLineHeight}, verticalAlign: ${props.textAlignVertical}`);
  console.log(`[path-render] size: ${JSON.stringify(props.size)}`);

  // Render each line as a path
  const pathElements: SvgString[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (!lineText) continue;

    const y = baseY + i * lineHeight;
    console.log(`[path-render] line ${i}: "${lineText}" at y=${y}`);
    const linePath = renderLineAsPath(
      lineText,
      font,
      props.fontSize,
      x,
      y,
      props.textAlignHorizontal,
      props.letterSpacing
    );
    console.log(`[path-render] linePath snippet: ${linePath?.slice(0, 100)}...`);

    if (linePath) {
      pathElements.push(
        path({
          d: linePath,
          fill: fillColor,
          "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
        })
      );
    }
  }

  if (pathElements.length === 0) {
    return EMPTY_SVG;
  }

  // Wrap in group if transform or opacity needed
  if (transformStr || props.opacity < 1 || pathElements.length > 1) {
    return g(
      {
        transform: transformStr || undefined,
        opacity: props.opacity < 1 ? props.opacity : undefined,
      },
      ...pathElements
    );
  }

  return pathElements[0];
}

/**
 * Render a single line of text as SVG path data
 */
function renderLineAsPath(
  text: string,
  font: Font,
  fontSize: number,
  x: number,
  y: number,
  align: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED",
  letterSpacing?: number
): string | null {
  const scale = fontSize / font.unitsPerEm;

  // Calculate text width for alignment
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    const advanceWidth = glyph.advanceWidth ?? 0;
    totalWidth += advanceWidth * scale;
    if (letterSpacing && i < text.length - 1) {
      totalWidth += letterSpacing;
    }
  }

  // Adjust x for alignment
  let adjustedX = x;
  if (align === "CENTER") {
    adjustedX = x - totalWidth / 2;
  } else if (align === "RIGHT") {
    adjustedX = x - totalWidth;
  }

  // Convert text to path
  const openTypePath = font.getPath(text, adjustedX, y, fontSize, {
    letterSpacing: letterSpacing ?? 0,
  });

  const pathData = openTypePath.toPathData(2);
  return pathData || null;
}

/**
 * Batch render multiple text nodes as paths
 *
 * More efficient when rendering multiple nodes with same fonts.
 */
export async function batchRenderTextNodesAsPaths(
  nodes: readonly FigNode[],
  ctx: PathRenderContext
): Promise<readonly SvgString[]> {
  const results: SvgString[] = [];

  for (const node of nodes) {
    const result = await renderTextNodeAsPath(node, ctx);
    results.push(result);
  }

  return results;
}

/**
 * Get font metrics from loaded font
 */
export function getFontMetricsFromFont(font: Font): {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
} {
  return {
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    // lineGap is not directly available in opentype.js, estimate from hhea table
    lineGap: (font.tables.hhea?.lineGap as number) ?? 0,
  };
}

/**
 * Calculate baseline offset for proper vertical positioning
 *
 * Figma uses specific baseline rules that we need to match.
 */
export function calculateBaselineOffset(
  font: Font,
  fontSize: number,
  verticalAlign: "TOP" | "CENTER" | "BOTTOM"
): number {
  const scale = fontSize / font.unitsPerEm;
  const ascender = font.ascender * scale;
  const descender = Math.abs(font.descender * scale);
  const lineHeight = ascender + descender;

  switch (verticalAlign) {
    case "TOP":
      // Baseline positioned so ascender touches top
      return ascender;
    case "CENTER":
      // Baseline positioned at center of text
      return ascender - lineHeight / 2 + fontSize / 2;
    case "BOTTOM":
      // Baseline positioned so descender touches bottom
      return fontSize - descender;
    default:
      return ascender;
  }
}
