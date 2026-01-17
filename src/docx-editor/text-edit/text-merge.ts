/**
 * @file Text merge utilities
 *
 * Utilities for merging plain text into DocxParagraph while preserving formatting.
 */

import type {
  DocxParagraph,
  DocxParagraphContent,
} from "../../docx/domain/paragraph";
import type { DocxRun, DocxRunProperties, DocxRunContent } from "../../docx/domain/run";

// =============================================================================
// Text Merge
// =============================================================================

/**
 * Merge plain text into a paragraph while preserving formatting.
 *
 * This function replaces the text content of the paragraph with the new text,
 * while attempting to preserve the formatting from the original runs.
 *
 * @param paragraph - The original paragraph
 * @param plainText - The new plain text to merge in
 * @returns A new paragraph with the merged text
 */
export function mergeTextIntoParagraph(
  paragraph: DocxParagraph,
  plainText: string
): DocxParagraph {
  if (plainText.length === 0) {
    // Return empty paragraph
    return {
      type: "paragraph",
      properties: paragraph.properties,
      content: [],
    };
  }

  // Get the base run properties to use for the new text
  const baseProperties = getBaseRunProperties(paragraph);

  // Create a single run with the new text
  const newRun: DocxRun = {
    type: "run",
    properties: baseProperties,
    content: [{ type: "text", value: plainText }],
  };

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: [newRun],
  };
}

/**
 * Get the base run properties from a paragraph.
 *
 * Uses the properties from the first text run, or undefined if none found.
 */
function getBaseRunProperties(paragraph: DocxParagraph): DocxRunProperties | undefined {
  for (const content of paragraph.content) {
    if (content.type === "run" && content.properties) {
      return content.properties;
    }
    if (content.type === "hyperlink") {
      for (const run of content.content) {
        if (run.properties) {
          return run.properties;
        }
      }
    }
  }
  return paragraph.properties?.rPr;
}

// =============================================================================
// Run Splitting
// =============================================================================

/**
 * Split a text run at a specific character offset.
 *
 * @param run - The run to split
 * @param offset - The character offset to split at
 * @returns A tuple of [before, after] runs
 */
export function splitRunAtOffset(
  run: DocxRun,
  offset: number
): [DocxRun, DocxRun] {
  const text = getRunPlainText(run);
  const safeOffset = Math.min(Math.max(offset, 0), text.length);

  const beforeText = text.slice(0, safeOffset);
  const afterText = text.slice(safeOffset);

  const beforeRun: DocxRun = {
    type: "run",
    properties: run.properties,
    content: beforeText.length > 0 ? [{ type: "text", value: beforeText }] : [],
  };

  const afterRun: DocxRun = {
    type: "run",
    properties: run.properties,
    content: afterText.length > 0 ? [{ type: "text", value: afterText }] : [],
  };

  return [beforeRun, afterRun];
}

/**
 * Get plain text from a run.
 */
function getRunPlainText(run: DocxRun): string {
  return run.content
    .map((content) => {
      switch (content.type) {
        case "text":
          return content.value;
        case "tab":
          return "\t";
        case "break":
          return "\n";
        case "symbol":
          return "";
      }
    })
    .join("");
}

// =============================================================================
// Run Merging
// =============================================================================

/**
 * Merge adjacent runs with the same formatting.
 *
 * @param content - Array of paragraph content items
 * @returns New array with merged runs
 */
export function mergeAdjacentRuns(
  content: readonly DocxParagraphContent[]
): DocxParagraphContent[] {
  if (content.length === 0) {
    return [];
  }

  const result: DocxParagraphContent[] = [];
  let currentRun: DocxRun | null = null;

  for (const item of content) {
    if (item.type !== "run") {
      // Non-run content: flush current run and add item
      if (currentRun) {
        result.push(currentRun);
        currentRun = null;
      }
      result.push(item);
      continue;
    }

    if (!currentRun) {
      // Start new run
      currentRun = { ...item, content: [...item.content] };
      continue;
    }

    // Check if we can merge
    if (areRunPropertiesEqual(currentRun.properties, item.properties)) {
      // Merge content
      currentRun = {
        ...currentRun,
        content: [...currentRun.content, ...item.content],
      };
    } else {
      // Different formatting: flush and start new
      result.push(currentRun);
      currentRun = { ...item, content: [...item.content] };
    }
  }

  // Flush remaining run
  if (currentRun) {
    result.push(currentRun);
  }

  return result;
}

/**
 * Check if two run properties are equal.
 */
function areRunPropertiesEqual(
  a: DocxRunProperties | undefined,
  b: DocxRunProperties | undefined
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }

  // Compare key formatting properties
  return (
    a.b === b.b &&
    a.i === b.i &&
    a.u?.val === b.u?.val &&
    a.strike === b.strike &&
    a.sz === b.sz &&
    a.rFonts?.ascii === b.rFonts?.ascii &&
    a.color?.val === b.color?.val
  );
}

// =============================================================================
// Run Properties at Position
// =============================================================================

/**
 * Get the run properties at a specific character offset in a paragraph.
 *
 * This is used to determine what formatting to apply when inserting text.
 *
 * @param paragraph - The paragraph to search in
 * @param charOffset - The character offset
 * @returns The run properties at that position, or undefined
 */
export function getRunPropertiesAtPosition(
  paragraph: DocxParagraph,
  charOffset: number
): DocxRunProperties | undefined {
  let currentOffset = 0;

  for (const content of paragraph.content) {
    if (content.type !== "run") {
      continue;
    }

    const runLength = getRunPlainText(content).length;

    if (currentOffset + runLength >= charOffset) {
      return content.properties;
    }

    currentOffset += runLength;
  }

  // Past end of paragraph - use last run's properties
  for (let i = paragraph.content.length - 1; i >= 0; i--) {
    const content = paragraph.content[i];
    if (content.type === "run") {
      return content.properties;
    }
  }

  return paragraph.properties?.rPr;
}

// =============================================================================
// Insert Text at Position
// =============================================================================

/**
 * Insert text at a specific character offset in a paragraph.
 *
 * @param paragraph - The paragraph to insert into
 * @param offset - The character offset to insert at
 * @param text - The text to insert
 * @returns A new paragraph with the text inserted
 */
export function insertTextAtOffset(
  paragraph: DocxParagraph,
  offset: number,
  text: string
): DocxParagraph {
  const properties = getRunPropertiesAtPosition(paragraph, offset);
  const currentText = getParagraphPlainText(paragraph);
  const newText = currentText.slice(0, offset) + text + currentText.slice(offset);

  // Simple approach: create single run with merged text
  const newRun: DocxRun = {
    type: "run",
    properties,
    content: [{ type: "text", value: newText }],
  };

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: [newRun],
  };
}

/**
 * Delete text at a specific range in a paragraph.
 *
 * @param paragraph - The paragraph to delete from
 * @param start - Start offset
 * @param end - End offset
 * @returns A new paragraph with the text deleted
 */
export function deleteTextRange(
  paragraph: DocxParagraph,
  start: number,
  end: number
): DocxParagraph {
  const properties = getRunPropertiesAtPosition(paragraph, start);
  const currentText = getParagraphPlainText(paragraph);
  const newText = currentText.slice(0, start) + currentText.slice(end);

  if (newText.length === 0) {
    return {
      type: "paragraph",
      properties: paragraph.properties,
      content: [],
    };
  }

  const newRun: DocxRun = {
    type: "run",
    properties,
    content: [{ type: "text", value: newText }],
  };

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: [newRun],
  };
}

/**
 * Get plain text from a paragraph.
 */
function getParagraphPlainText(paragraph: DocxParagraph): string {
  let text = "";
  for (const content of paragraph.content) {
    if (content.type === "run") {
      text += getRunPlainText(content);
    } else if (content.type === "hyperlink") {
      for (const run of content.content) {
        text += getRunPlainText(run);
      }
    }
  }
  return text;
}

// =============================================================================
// Apply Formatting
// =============================================================================

/**
 * Apply run properties to a range in a paragraph.
 *
 * @param paragraph - The paragraph to modify
 * @param start - Start offset
 * @param end - End offset
 * @param properties - The properties to apply
 * @returns A new paragraph with the formatting applied
 */
export function applyFormatToRange(
  paragraph: DocxParagraph,
  start: number,
  end: number,
  properties: Partial<DocxRunProperties>
): DocxParagraph {
  const text = getParagraphPlainText(paragraph);
  const beforeText = text.slice(0, start);
  const selectedText = text.slice(start, end);
  const afterText = text.slice(end);

  const baseProperties = getRunPropertiesAtPosition(paragraph, start);
  const newRuns: DocxRun[] = [];

  if (beforeText.length > 0) {
    newRuns.push({
      type: "run",
      properties: baseProperties,
      content: [{ type: "text", value: beforeText }],
    });
  }

  if (selectedText.length > 0) {
    newRuns.push({
      type: "run",
      properties: { ...baseProperties, ...properties },
      content: [{ type: "text", value: selectedText }],
    });
  }

  if (afterText.length > 0) {
    newRuns.push({
      type: "run",
      properties: getRunPropertiesAtPosition(paragraph, end) ?? baseProperties,
      content: [{ type: "text", value: afterText }],
    });
  }

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: newRuns,
  };
}
