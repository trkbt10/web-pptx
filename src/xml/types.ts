/**
 * @file XML type definitions and utilities
 * Re-exports from AST module with additional helpers.
 */

import { isXmlElement, isXmlText, getTextContent } from "./ast";

// Re-export AST types
export type { XmlElement, XmlText, XmlNode, XmlDocument } from "./ast";
export {
  isXmlElement,
  isXmlText,
  getChild,
  getChildren,
  getTextContent,
  getAttr,
  hasAttr,
  getByPath,
  getAttrByPath,
  getTextByPath,
  getChildrenByPath,
  mapChildren,
  findChild,
  hasChild,
} from "./ast";

// =============================================================================
// Text Extraction (ECMA-376 compliant)
// =============================================================================

/**
 * Extract text content from XML AST nodes.
 *
 * This function uses type guards to safely extract text from various node types.
 * It accepts `unknown` to handle transitional code that may pass different formats.
 *
 * Handles:
 * - Plain strings (passed through)
 * - XmlText nodes `{ type: "text", value: "..." }` (returns value property)
 * - XmlElement nodes (returns concatenated text children)
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.12 (a:t - Text)
 * @param value - Value to extract text from
 * @returns Text content or undefined
 */
export function getXmlText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  // Handle plain string
  if (typeof value === "string") {
    return value;
  }

  // Handle XmlText node (type: "text")
  if (isXmlText(value)) {
    return value.value;
  }

  // Handle XmlElement - get concatenated text content
  if (isXmlElement(value)) {
    const text = getTextContent(value);
    if (text.length > 0) {
      return text;
    }
    return undefined;
  }

  return undefined;
}
