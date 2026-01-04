/**
 * @file Cursor position calculation
 *
 * Maps textarea cursor position to visual coordinates on the SVG text.
 * Uses LayoutResult from the text-layout engine to compute visual positions.
 */

import type { TextBody } from "../../../pptx/domain";
import type { Pixels } from "../../../pptx/domain/types";
import type { LayoutResult, LayoutLine, PositionedSpan } from "../../../pptx/render/text-layout";

// =============================================================================
// Types
// =============================================================================

/**
 * Cursor position in the text
 */
export type CursorPosition = {
  /** Paragraph index */
  readonly paragraphIndex: number;
  /** Character offset within the paragraph */
  readonly charOffset: number;
};

/**
 * Selection range in the text
 */
export type TextSelection = {
  readonly start: CursorPosition;
  readonly end: CursorPosition;
};

/**
 * Visual cursor coordinates
 */
export type CursorCoordinates = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly height: Pixels;
};

// =============================================================================
// Text Position Mapping
// =============================================================================

/**
 * Convert flat character offset to paragraph-relative position.
 */
export function offsetToCursorPosition(
  textBody: TextBody,
  offset: number,
): CursorPosition {
  // eslint-disable-next-line no-restricted-syntax -- performance-critical iteration
  let remaining = offset;

  for (const [pIdx, para] of textBody.paragraphs.entries()) {
    const paraText = getParagraphText(para);
    const paraLength = paraText.length;

    if (remaining <= paraLength) {
      return { paragraphIndex: pIdx, charOffset: remaining };
    }

    // +1 for newline between paragraphs
    remaining -= paraLength + 1;
  }

  // End of text
  const lastParaIdx = textBody.paragraphs.length - 1;
  const lastPara = textBody.paragraphs[lastParaIdx];
  return {
    paragraphIndex: lastParaIdx,
    charOffset: getParagraphText(lastPara).length,
  };
}

/**
 * Convert paragraph-relative position to flat character offset.
 */
export function cursorPositionToOffset(
  textBody: TextBody,
  position: CursorPosition,
): number {
  const offset = textBody.paragraphs
    .slice(0, position.paragraphIndex)
    .reduce((sum, para) => sum + getParagraphText(para).length + 1, 0);
  return offset + position.charOffset;
}

/**
 * Get plain text from a paragraph.
 */
function getParagraphText(para: TextBody["paragraphs"][number]): string {
  return para.runs
    .map((run) => {
      switch (run.type) {
        case "text":
          return run.text;
        case "break":
          return "\n";
        case "field":
          return run.text ?? "";
      }
    })
    .join("");
}

/**
 * Get full plain text from TextBody.
 */
export function getPlainText(textBody: TextBody): string {
  return textBody.paragraphs.map((p) => getParagraphText(p)).join("\n");
}

/**
 * Check if two cursor positions are equal.
 */
export function isSamePosition(a: CursorPosition, b: CursorPosition): boolean {
  return a.paragraphIndex === b.paragraphIndex && a.charOffset === b.charOffset;
}

/**
 * Check if cursor position is before another.
 */
export function isBefore(a: CursorPosition, b: CursorPosition): boolean {
  if (a.paragraphIndex < b.paragraphIndex) {
    return true;
  }
  if (a.paragraphIndex > b.paragraphIndex) {
    return false;
  }
  return a.charOffset < b.charOffset;
}

/**
 * Normalize selection so start is before end.
 */
export function normalizeSelection(selection: TextSelection): TextSelection {
  if (isBefore(selection.end, selection.start)) {
    return { start: selection.end, end: selection.start };
  }
  return selection;
}

// =============================================================================
// Visual Coordinate Mapping
// =============================================================================

/**
 * Map cursor position to visual coordinates using LayoutResult.
 *
 * Walks through the layout result to find the exact x/y position
 * corresponding to the cursor position.
 */
export function cursorPositionToCoordinates(
  position: CursorPosition,
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  const { paragraphIndex, charOffset } = position;

  // Check bounds
  if (paragraphIndex >= layoutResult.paragraphs.length) {
    return getEndOfTextCoordinates(layoutResult);
  }

  const para = layoutResult.paragraphs[paragraphIndex];
  if (para.lines.length === 0) {
    // Empty paragraph - use next paragraph or end of text
    return getEmptyParagraphCoordinates(paragraphIndex, layoutResult);
  }

  // Find the line and span containing the cursor
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remainingOffset = charOffset;

  for (const line of para.lines) {
    const lineTextLength = getLineTextLength(line);

    if (remainingOffset <= lineTextLength) {
      return getCursorInLineCoordinates(line, remainingOffset);
    }

    remainingOffset -= lineTextLength;
  }

  // Past end of paragraph - return end of last line
  const lastLine = para.lines[para.lines.length - 1];
  return getEndOfLineCoordinates(lastLine);
}

/**
 * Get coordinates for cursor within a line.
 */
function getCursorInLineCoordinates(
  line: LayoutLine,
  charOffset: number,
): CursorCoordinates {
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let cursorX = line.x as number;
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remaining = charOffset;

  for (const span of line.spans) {
    const spanLength = span.text.length;

    if (remaining <= spanLength) {
      const x = cursorX + getTextWidthForChars(span, remaining);
      return {
        x: x as Pixels,
        y: (line.y as number) - (line.height as number) * 0.8 as Pixels,
        height: line.height,
      };
    }

    remaining -= spanLength;
    cursorX += (span.width as number) + (span.dx as number);
  }

  // End of line
  return {
    x: cursorX as Pixels,
    y: (line.y as number) - (line.height as number) * 0.8 as Pixels,
    height: line.height,
  };
}

/**
 * Get coordinates for end of a line.
 */
function getEndOfLineCoordinates(line: LayoutLine): CursorCoordinates {
  const endX = line.spans.reduce(
    (x, span) => x + (span.width as number) + (span.dx as number),
    line.x as number,
  );

  return {
    x: endX as Pixels,
    y: (line.y as number) - (line.height as number) * 0.8 as Pixels,
    height: line.height,
  };
}

/**
 * Get coordinates for an empty paragraph.
 */
function getEmptyParagraphCoordinates(
  paragraphIndex: number,
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  // Try to find previous paragraph's end
  for (let i = paragraphIndex - 1; i >= 0; i--) {
    const prevPara = layoutResult.paragraphs[i];
    if (prevPara.lines.length > 0) {
      const lastLine = prevPara.lines[prevPara.lines.length - 1];
      // Position at start of next line
      const defaultHeight = 14 as Pixels; // Default line height
      return {
        x: lastLine.x,
        y: (lastLine.y as number) + (lastLine.height as number) as Pixels,
        height: defaultHeight,
      };
    }
  }

  // No previous content - return top-left
  return {
    x: 0 as Pixels,
    y: 0 as Pixels,
    height: 14 as Pixels,
  };
}

/**
 * Get coordinates for end of text.
 */
function getEndOfTextCoordinates(
  layoutResult: LayoutResult,
): CursorCoordinates | undefined {
  for (let i = layoutResult.paragraphs.length - 1; i >= 0; i--) {
    const para = layoutResult.paragraphs[i];
    if (para.lines.length > 0) {
      const lastLine = para.lines[para.lines.length - 1];
      return getEndOfLineCoordinates(lastLine);
    }
  }

  // Empty text
  return {
    x: 0 as Pixels,
    y: 0 as Pixels,
    height: 14 as Pixels,
  };
}

/**
 * Get text length of a line.
 */
function getLineTextLength(line: LayoutLine): number {
  return line.spans.reduce((sum, span) => sum + span.text.length, 0);
}

/**
 * Estimate width for a given number of characters.
 * Uses average character width approximation.
 */
function getTextWidthForChars(span: PositionedSpan, charCount: number): number {
  if (charCount === 0) {
    return 0;
  }
  if (charCount >= span.text.length) {
    return span.width as number;
  }

  // Proportional width estimation
  const avgCharWidth = (span.width as number) / span.text.length;
  return avgCharWidth * charCount;
}

// =============================================================================
// Selection Range Coordinates
// =============================================================================

/**
 * Selection highlight rectangle
 */
export type SelectionRect = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Get selection highlight rectangles for a text selection.
 * May return multiple rects for multi-line selections.
 */
export function selectionToRects(
  selection: TextSelection,
  layoutResult: LayoutResult,
): readonly SelectionRect[] {
  const normalized = normalizeSelection(selection);
  const rects: SelectionRect[] = [];

  // Convert positions to flat offsets for comparison
  const startCoords = cursorPositionToCoordinates(normalized.start, layoutResult);
  const endCoords = cursorPositionToCoordinates(normalized.end, layoutResult);

  if (!startCoords || !endCoords) {
    return rects;
  }

  // Simple case: same line
  if (normalized.start.paragraphIndex === normalized.end.paragraphIndex) {
    const startPara = layoutResult.paragraphs[normalized.start.paragraphIndex];
    if (startPara) {
      rects.push(...getSelectionRectsInParagraph(
        startPara,
        normalized.start.charOffset,
        normalized.end.charOffset,
      ));
    }
  } else {
    // Multi-paragraph selection - iterate through paragraphs
    for (let pIdx = normalized.start.paragraphIndex; pIdx <= normalized.end.paragraphIndex; pIdx++) {
      const para = layoutResult.paragraphs[pIdx];
      if (!para) {
        continue;
      }

      if (pIdx === normalized.start.paragraphIndex) {
        // First paragraph: from start offset to end
        const paraLength = getParagraphTextLength(para);
        rects.push(...getSelectionRectsInParagraph(para, normalized.start.charOffset, paraLength));
      } else if (pIdx === normalized.end.paragraphIndex) {
        // Last paragraph: from start to end offset
        rects.push(...getSelectionRectsInParagraph(para, 0, normalized.end.charOffset));
      } else {
        // Middle paragraphs: full line
        const paraLength = getParagraphTextLength(para);
        rects.push(...getSelectionRectsInParagraph(para, 0, paraLength));
      }
    }
  }

  return rects;
}

/**
 * Get selection rects within a single paragraph.
 */
function getSelectionRectsInParagraph(
  para: { readonly lines: readonly LayoutLine[] },
  startOffset: number,
  endOffset: number,
): SelectionRect[] {
  const rects: SelectionRect[] = [];
  // eslint-disable-next-line no-restricted-syntax -- accumulating offset through loop
  let currentOffset = 0;

  for (const line of para.lines) {
    const lineLength = getLineTextLength(line);
    const lineStart = currentOffset;
    const lineEnd = currentOffset + lineLength;

    // Check if selection intersects this line
    if (startOffset < lineEnd && endOffset > lineStart) {
      const selStart = Math.max(startOffset - lineStart, 0);
      const selEnd = Math.min(endOffset - lineStart, lineLength);

      const startX = getCursorXInLine(line, selStart);
      const endX = getCursorXInLine(line, selEnd);

      rects.push({
        x: startX as Pixels,
        y: (line.y as number) - (line.height as number) * 0.8 as Pixels,
        width: (endX - startX) as Pixels,
        height: line.height,
      });
    }

    currentOffset = lineEnd;
  }

  return rects;
}

/**
 * Get x position for cursor at given offset in line.
 */
function getCursorXInLine(line: LayoutLine, charOffset: number): number {
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let x = line.x as number;
  // eslint-disable-next-line no-restricted-syntax -- early return in loop
  let remaining = charOffset;

  for (const span of line.spans) {
    if (remaining <= span.text.length) {
      return x + getTextWidthForChars(span, remaining);
    }
    remaining -= span.text.length;
    x += (span.width as number) + (span.dx as number);
  }

  return x;
}

/**
 * Get total text length of a paragraph.
 */
function getParagraphTextLength(
  para: { readonly lines: readonly LayoutLine[] },
): number {
  return para.lines.reduce((sum, line) => sum + getLineTextLength(line), 0);
}

// =============================================================================
// Text Merging
// =============================================================================

/**
 * Merge edited text into original TextBody, preserving styling.
 * This is a simplified version that only updates text content.
 */
export function mergeTextIntoBody(
  originalBody: TextBody,
  newText: string,
): TextBody {
  const lines = newText.split("\n");

  // Create new paragraphs, preserving original paragraph properties where possible
  const paragraphs: TextBody["paragraphs"] = lines.map((line, index) => {
    const originalParagraph = originalBody.paragraphs[index];
    return {
      properties: originalParagraph?.properties ?? {},
      runs: [{ type: "text" as const, text: line }],
    };
  });

  const defaultParagraph: TextBody["paragraphs"][number] = {
    properties: {},
    runs: [{ type: "text", text: "" }],
  };

  return {
    bodyProperties: originalBody.bodyProperties,
    paragraphs: paragraphs.length > 0 ? paragraphs : [defaultParagraph],
  };
}
