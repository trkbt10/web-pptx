/**
 * @file HTML to TextBody conversion
 *
 * Converts HTML from contentEditable elements back to PPTX TextBody.
 */

import type { TextBody, Paragraph, TextRun, BodyProperties } from "../../../pptx/domain";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for parsing HTML
 */
export type HtmlToTextOptions = {
  /** Original body properties to preserve */
  readonly bodyProperties?: BodyProperties;
};

// =============================================================================
// HTML Parsing
// =============================================================================

/**
 * Parse HTML string into DOM nodes
 */
function parseHtmlNodes(html: string): readonly Node[] {
  const template = document.createElement("template");
  template.innerHTML = html;
  return Array.from(template.content.childNodes);
}

/**
 * Extract text runs from a node
 */
function extractRunsFromNode(node: Node): readonly TextRun[] {
  const runs: TextRun[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text.length > 0) {
      runs.push({ type: "text", text });
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (tagName === "br") {
      runs.push({ type: "break" });
    } else if (tagName === "span" || tagName === "div" || tagName === "p") {
      // Recursively extract from children
      for (const child of Array.from(element.childNodes)) {
        runs.push(...extractRunsFromNode(child));
      }
    } else {
      // Other elements - extract text content
      const text = element.textContent ?? "";
      if (text.length > 0) {
        runs.push({ type: "text", text });
      }
    }
  }

  return runs;
}

/**
 * Extract paragraphs from parsed nodes
 */
function extractParagraphs(nodes: readonly Node[]): readonly Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim().length > 0) {
        paragraphs.push({
          properties: {},
          runs: [{ type: "text", text }],
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (tagName === "div" || tagName === "p") {
        // This is a paragraph
        const runs = extractRunsFromNode(element);
        paragraphs.push({
          properties: {},
          runs: runs.length > 0 ? runs : [{ type: "text", text: "" }],
        });
      } else if (tagName === "br") {
        // Line break creates new paragraph
        paragraphs.push({
          properties: {},
          runs: [{ type: "text", text: "" }],
        });
      } else {
        // Other elements - extract as single paragraph
        const runs = extractRunsFromNode(element);
        if (runs.length > 0) {
          paragraphs.push({
            properties: {},
            runs,
          });
        }
      }
    }
  }

  // Ensure at least one paragraph
  if (paragraphs.length === 0) {
    paragraphs.push({
      properties: {},
      runs: [{ type: "text", text: "" }],
    });
  }

  return paragraphs;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert HTML string to TextBody
 */
export function htmlToTextBody(
  html: string,
  options: HtmlToTextOptions = {}
): TextBody {
  const nodes = parseHtmlNodes(html);
  const paragraphs = extractParagraphs(nodes);

  return {
    bodyProperties: options.bodyProperties ?? {},
    paragraphs,
  };
}

/**
 * Convert plain text to TextBody
 */
export function plainTextToTextBody(
  text: string,
  options: HtmlToTextOptions = {}
): TextBody {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = lines.map((line) => ({
    properties: {},
    runs: [{ type: "text", text: line }],
  }));

  return {
    bodyProperties: options.bodyProperties ?? {},
    paragraphs: paragraphs.length > 0 ? paragraphs : [{ properties: {}, runs: [{ type: "text", text: "" }] }],
  };
}

/**
 * Merge edited text into original TextBody, preserving styling
 * This is a simplified version that only updates text content
 */
export function mergeTextIntoBody(
  originalBody: TextBody,
  newText: string
): TextBody {
  const lines = newText.split("\n");

  // Create new paragraphs, preserving original paragraph properties where possible
  const paragraphs: Paragraph[] = lines.map((line, index) => {
    const originalParagraph = originalBody.paragraphs[index];
    return {
      properties: originalParagraph?.properties ?? {},
      runs: [{ type: "text" as const, text: line }],
    };
  });

  return {
    bodyProperties: originalBody.bodyProperties,
    paragraphs: paragraphs.length > 0 ? paragraphs : [{ properties: {}, runs: [{ type: "text", text: "" }] }],
  };
}
