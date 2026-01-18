/**
 * @file Text merge utilities
 *
 * Utilities for merging plain text into DocxParagraph while preserving formatting.
 */

import type {
  DocxParagraph,
  DocxParagraphContent,
} from "../../docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "../../docx/domain/run";

// =============================================================================
// Text Merge
// =============================================================================

/**
 * Build a character-to-properties map from a paragraph.
 * Each index corresponds to a character position and contains the run properties for that character.
 */
function buildCharacterPropertiesMap(paragraph: DocxParagraph): (DocxRunProperties | undefined)[] {
  const map: (DocxRunProperties | undefined)[] = [];

  for (const content of paragraph.content) {
    if (content.type === "run") {
      const text = getRunPlainText(content);
      for (let i = 0; i < text.length; i++) {
        map.push(content.properties);
      }
    } else if (content.type === "hyperlink") {
      for (const run of content.content) {
        const text = getRunPlainText(run);
        for (let i = 0; i < text.length; i++) {
          map.push(run.properties);
        }
      }
    }
  }

  return map;
}

/**
 * Create runs from text and a properties map.
 * Groups consecutive characters with the same properties into runs.
 */
function createRunsFromPropertiesMap(
  text: string,
  propertiesMap: (DocxRunProperties | undefined)[],
  defaultProperties: DocxRunProperties | undefined,
): DocxRun[] {
  if (text.length === 0) {
    return [];
  }

  const runs: DocxRun[] = [];
  let currentText = "";
  let currentProps: DocxRunProperties | undefined = propertiesMap[0] ?? defaultProperties;

  for (let i = 0; i < text.length; i++) {
    const props = propertiesMap[i] ?? defaultProperties;

    if (areRunPropertiesEqual(props, currentProps)) {
      currentText += text[i];
    } else {
      // Flush current run
      if (currentText.length > 0) {
        runs.push({
          type: "run",
          properties: currentProps,
          content: [{ type: "text", value: currentText }],
        });
      }
      currentText = text[i];
      currentProps = props;
    }
  }

  // Flush remaining text
  if (currentText.length > 0) {
    runs.push({
      type: "run",
      properties: currentProps,
      content: [{ type: "text", value: currentText }],
    });
  }

  return runs;
}

/**
 * Merge plain text into a paragraph while preserving formatting.
 *
 * This function replaces the text content of the paragraph with the new text,
 * while attempting to preserve the formatting from the original runs.
 * It uses a character-level mapping to preserve inline formatting.
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

  // Build character-to-properties map from original paragraph
  const originalMap = buildCharacterPropertiesMap(paragraph);
  const originalText = getParagraphPlainText(paragraph);
  const defaultProps = getBaseRunProperties(paragraph);

  // If text is unchanged, return original paragraph
  if (plainText === originalText) {
    return paragraph;
  }

  // Find the common prefix and suffix lengths
  const { prefixLen, suffixLen } = findCommonPrefixSuffix(originalText, plainText);

  // Build new properties map by preserving formatting from unchanged regions
  const newMap: (DocxRunProperties | undefined)[] = [];

  // Copy prefix properties
  for (let i = 0; i < prefixLen; i++) {
    newMap.push(originalMap[i]);
  }

  // For the changed middle section, use properties from the edit point
  const editStartProps = originalMap[prefixLen] ?? defaultProps;
  const changedLength = plainText.length - prefixLen - suffixLen;
  for (let i = 0; i < changedLength; i++) {
    newMap.push(editStartProps);
  }

  // Copy suffix properties
  const originalSuffixStart = originalText.length - suffixLen;
  for (let i = 0; i < suffixLen; i++) {
    newMap.push(originalMap[originalSuffixStart + i]);
  }

  // Create runs from the new properties map
  const newRuns = createRunsFromPropertiesMap(plainText, newMap, defaultProps);

  return {
    type: "paragraph",
    properties: paragraph.properties,
    content: newRuns,
  };
}

/**
 * Find the length of common prefix and suffix between two strings.
 */
function findCommonPrefixSuffix(
  original: string,
  modified: string,
): { prefixLen: number; suffixLen: number } {
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(original.length, modified.length);
  while (prefixLen < minLen && original[prefixLen] === modified[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (but don't overlap with prefix)
  let suffixLen = 0;
  const maxSuffixLen = minLen - prefixLen;
  while (
    suffixLen < maxSuffixLen &&
    original[original.length - 1 - suffixLen] === modified[modified.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  return { prefixLen, suffixLen };
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
 * Flush current run and append new item.
 */
function flushAndAppend(
  result: DocxParagraphContent[],
  currentRun: DocxRun | null,
  item: DocxParagraphContent,
): DocxParagraphContent[] {
  if (currentRun !== null) {
    return [...result, currentRun, item];
  }
  return [...result, item];
}

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

  type AccumulatorState = {
    readonly result: DocxParagraphContent[];
    readonly currentRun: DocxRun | null;
  };

  const final = content.reduce<AccumulatorState>(
    (acc, item) => {
      if (item.type !== "run") {
        // Non-run content: flush current run and add item
        const newResult = flushAndAppend(acc.result, acc.currentRun, item);
        return { result: newResult, currentRun: null };
      }

      if (acc.currentRun === null) {
        // Start new run
        return { result: acc.result, currentRun: { ...item, content: [...item.content] } };
      }

      // Check if we can merge
      if (areRunPropertiesEqual(acc.currentRun.properties, item.properties)) {
        // Merge content
        const mergedRun: DocxRun = {
          ...acc.currentRun,
          content: [...acc.currentRun.content, ...item.content],
        };
        return { result: acc.result, currentRun: mergedRun };
      }

      // Different formatting: flush and start new
      return {
        result: [...acc.result, acc.currentRun],
        currentRun: { ...item, content: [...item.content] },
      };
    },
    { result: [], currentRun: null },
  );

  // Flush remaining run
  if (final.currentRun !== null) {
    return [...final.result, final.currentRun];
  }

  return final.result;
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
  type AccumulatorState = {
    readonly currentOffset: number;
    readonly found: DocxRunProperties | undefined;
  };

  const result = paragraph.content.reduce<AccumulatorState>(
    (acc, content) => {
      if (acc.found !== undefined) {
        return acc;
      }

      if (content.type !== "run") {
        return acc;
      }

      const runLength = getRunPlainText(content).length;

      if (acc.currentOffset + runLength >= charOffset) {
        return { currentOffset: acc.currentOffset, found: content.properties };
      }

      return { currentOffset: acc.currentOffset + runLength, found: undefined };
    },
    { currentOffset: 0, found: undefined },
  );

  if (result.found !== undefined) {
    return result.found;
  }

  // Past end of paragraph - use last run's properties
  const runs = paragraph.content.filter((c): c is DocxRun => c.type === "run");
  if (runs.length > 0) {
    return runs[runs.length - 1].properties;
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
  return paragraph.content.reduce((acc, content) => {
    if (content.type === "run") {
      return acc + getRunPlainText(content);
    }
    if (content.type === "hyperlink") {
      return acc + content.content.reduce((hypAcc, run) => hypAcc + getRunPlainText(run), "");
    }
    return acc;
  }, "");
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

// =============================================================================
// Minimal Paragraph Creation
// =============================================================================

/**
 * Create a minimal paragraph with the given text.
 */
function createMinimalParagraph(text: string): DocxParagraph {
  if (text.length === 0) {
    return { type: "paragraph", content: [] };
  }
  return {
    type: "paragraph",
    content: [{
      type: "run",
      content: [{ type: "text", value: text }],
    }],
  };
}

// =============================================================================
// Apply Text to Document
// =============================================================================

/**
 * Apply plain text changes to an array of paragraphs.
 *
 * This function synchronizes a plain text string with an array of paragraphs,
 * preserving the formatting from the original paragraphs where possible.
 *
 * @param originalParagraphs - The original paragraphs
 * @param newText - The new plain text (paragraphs separated by newlines)
 * @returns New array of paragraphs with the text applied
 */
export function applyTextToParagraphs(
  originalParagraphs: readonly DocxParagraph[],
  newText: string
): DocxParagraph[] {
  const lines = newText.split("\n");
  const result: DocxParagraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const originalPara = originalParagraphs[i];

    if (originalPara !== undefined) {
      // Reuse original paragraph with new text
      result.push(mergeTextIntoParagraph(originalPara, line));
    } else {
      // Create new paragraph based on last original paragraph's properties
      const templatePara = originalParagraphs[originalParagraphs.length - 1];
      if (templatePara !== undefined) {
        result.push(mergeTextIntoParagraph(templatePara, line));
      } else {
        // Create minimal paragraph
        result.push(createMinimalParagraph(line));
      }
    }
  }

  return result;
}
