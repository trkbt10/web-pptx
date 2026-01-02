/**
 * @file Type guards for OOXML elements
 *
 * Provides runtime type checking for OOXML elements parsed from XML.
 * These guards bridge the gap between generic XmlElement and typed OOXML types.
 *
 * Design principle: OOXML types are structural views of XmlElement,
 * accessed via getChild/getChildren helpers rather than direct property access.
 */

import type { XmlElement } from "../../xml";
import { isXmlElement, getChild } from "../../xml";

import type {
  ShapeElement,
  PictureElement,
  GroupShapeElement,
  GraphicFrameElement,
  ConnectionShapeElement,
  AlternateContentElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  ShapePropertiesElement,
} from "./presentationml";

import type {
  TextBodyElement,
  ParagraphElement,
  TextRunElement,
  RunPropertiesElement,
  TransformElement,
  ListStyleElement,
  SpacingElement,
  LinePropertiesElement,
} from "./drawingml";

// =============================================================================
// Core Element Type Guards
// =============================================================================

/**
 * Type guard for XmlElement with specific name.
 * Base helper for all OOXML type guards.
 */
export function isElementNamed(node: unknown, name: string): node is XmlElement {
  if (!isXmlElement(node)) {
    return false;
  }
  return node.name === name;
}

/**
 * Check if an XmlElement has a specific child element.
 */
export function hasChildElement(node: XmlElement, childName: string): boolean {
  return getChild(node, childName) !== undefined;
}

// =============================================================================
// PresentationML Element Guards (p: namespace)
// =============================================================================

/**
 * Type guard for Shape element (p:sp).
 * A shape has p:nvSpPr (non-visual properties) and optionally p:spPr, p:txBody.
 */
export function isShapeElement(node: unknown): node is XmlElement & ShapeElement {
  if (!isElementNamed(node, "p:sp")) {
    return false;
  }
  // Shapes should have non-visual shape properties
  return hasChildElement(node, "p:nvSpPr");
}

/**
 * Type guard for Picture element (p:pic).
 * A picture has p:nvPicPr and either p:blipFill or mc:AlternateContent.
 */
export function isPictureElement(node: unknown): node is XmlElement & PictureElement {
  if (!isElementNamed(node, "p:pic")) {
    return false;
  }
  return hasChildElement(node, "p:nvPicPr");
}

/**
 * Type guard for Group Shape element (p:grpSp).
 * A group has p:nvGrpSpPr and p:grpSpPr.
 */
export function isGroupShapeElement(node: unknown): node is XmlElement & GroupShapeElement {
  if (!isElementNamed(node, "p:grpSp")) {
    return false;
  }
  return hasChildElement(node, "p:nvGrpSpPr");
}

/**
 * Type guard for Graphic Frame element (p:graphicFrame).
 * A graphic frame has p:nvGraphicFramePr and a:graphic.
 */
export function isGraphicFrameElement(node: unknown): node is XmlElement & GraphicFrameElement {
  if (!isElementNamed(node, "p:graphicFrame")) {
    return false;
  }
  return hasChildElement(node, "p:nvGraphicFramePr");
}

/**
 * Type guard for Connection Shape element (p:cxnSp).
 */
export function isConnectionShapeElement(node: unknown): node is XmlElement & ConnectionShapeElement {
  if (!isElementNamed(node, "p:cxnSp")) {
    return false;
  }
  return hasChildElement(node, "p:nvCxnSpPr");
}

/**
 * Type guard for Alternate Content element (mc:AlternateContent).
 */
export function isAlternateContentElement(node: unknown): node is XmlElement & AlternateContentElement {
  return isElementNamed(node, "mc:AlternateContent");
}

// =============================================================================
// Table Element Guards (a: namespace)
// =============================================================================

/**
 * Type guard for Table element (a:tbl).
 */
export function isTableElement(node: unknown): node is XmlElement & TableElement {
  return isElementNamed(node, "a:tbl");
}

/**
 * Type guard for Table Row element (a:tr).
 */
export function isTableRowElement(node: unknown): node is XmlElement & TableRowElement {
  return isElementNamed(node, "a:tr");
}

/**
 * Type guard for Table Cell element (a:tc).
 */
export function isTableCellElement(node: unknown): node is XmlElement & TableCellElement {
  return isElementNamed(node, "a:tc");
}

// =============================================================================
// DrawingML Element Guards (a: namespace)
// =============================================================================

/**
 * Type guard for Text Body element (a:txBody or p:txBody).
 */
export function isTextBodyElement(node: unknown): node is XmlElement & TextBodyElement {
  if (!isXmlElement(node)) {
    return false;
  }
  return node.name === "a:txBody" || node.name === "p:txBody";
}

/**
 * Type guard for Paragraph element (a:p).
 */
export function isParagraphElement(node: unknown): node is XmlElement & ParagraphElement {
  return isElementNamed(node, "a:p");
}

/**
 * Type guard for Text Run element (a:r).
 */
export function isTextRunElement(node: unknown): node is XmlElement & TextRunElement {
  return isElementNamed(node, "a:r");
}

/**
 * Type guard for Run Properties element (a:rPr).
 */
export function isRunPropertiesElement(node: unknown): node is XmlElement & RunPropertiesElement {
  return isElementNamed(node, "a:rPr");
}

/**
 * Type guard for Transform element (a:xfrm).
 */
export function isTransformElement(node: unknown): node is XmlElement & TransformElement {
  if (!isElementNamed(node, "a:xfrm")) {
    return false;
  }
  // Transform typically has a:off and/or a:ext
  if (hasChildElement(node, "a:off")) {
    return true;
  }
  return hasChildElement(node, "a:ext");
}

/**
 * Type guard for List Style element (a:lstStyle).
 */
export function isListStyleElement(node: unknown): node is XmlElement & ListStyleElement {
  return isElementNamed(node, "a:lstStyle");
}

/**
 * Type guard for Spacing element (a:lnSpc, a:spcBef, a:spcAft).
 */
export function isSpacingElement(node: unknown): node is XmlElement & SpacingElement {
  if (!isXmlElement(node)) {
    return false;
  }
  return node.name === "a:lnSpc" || node.name === "a:spcBef" || node.name === "a:spcAft";
}

/**
 * Type guard for Line Properties element (a:ln).
 */
export function isLinePropertiesElement(node: unknown): node is XmlElement & LinePropertiesElement {
  return isElementNamed(node, "a:ln");
}

/**
 * Type guard for Shape Properties element (p:spPr).
 */
export function isShapePropertiesElement(node: unknown): node is XmlElement & ShapePropertiesElement {
  return isElementNamed(node, "p:spPr");
}

// =============================================================================
// Safe Accessor Helpers
// =============================================================================

/**
 * Get typed child element with type guard validation.
 * Returns undefined if child doesn't exist or type check fails.
 */
export function getTypedChild<T extends XmlElement>(
  parent: XmlElement | undefined,
  childName: string,
  guard: (node: unknown) => node is T,
): T | undefined {
  if (parent === undefined) {
    return undefined;
  }
  const child = getChild(parent, childName);
  if (child === undefined) {
    return undefined;
  }
  if (guard(child)) {
    return child;
  }
  return undefined;
}

/**
 * Assert element type with guard, throwing if invalid.
 * Use when element is known to exist and must be of correct type.
 */
export function assertElementType<T extends XmlElement>(
  node: unknown,
  guard: (node: unknown) => node is T,
  message: string,
): T {
  if (!guard(node)) {
    throw new Error(message);
  }
  return node;
}

// =============================================================================
// Element Name to Type Mapping
// =============================================================================

/**
 * Map of element names to their expected types.
 * Used for documentation and potential runtime validation.
 */
export const ELEMENT_TYPE_MAP = {
  // PresentationML
  "p:sp": "ShapeElement",
  "p:pic": "PictureElement",
  "p:grpSp": "GroupShapeElement",
  "p:graphicFrame": "GraphicFrameElement",
  "p:cxnSp": "ConnectionShapeElement",
  "mc:AlternateContent": "AlternateContentElement",
  // Tables
  "a:tbl": "TableElement",
  "a:tr": "TableRowElement",
  "a:tc": "TableCellElement",
  // DrawingML
  "a:txBody": "TextBodyElement",
  "p:txBody": "TextBodyElement",
  "a:p": "ParagraphElement",
  "a:r": "TextRunElement",
  "a:rPr": "RunPropertiesElement",
  "a:xfrm": "TransformElement",
  "a:lstStyle": "ListStyleElement",
  "a:lnSpc": "SpacingElement",
  "a:spcBef": "SpacingElement",
  "a:spcAft": "SpacingElement",
  "a:ln": "LinePropertiesElement",
  "p:spPr": "ShapePropertiesElement",
} as const;

export type ElementTypeName = keyof typeof ELEMENT_TYPE_MAP;
