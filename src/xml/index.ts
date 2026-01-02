/**
 * @file XML module exports
 * XML document manipulation utilities, extending markup base
 *
 * Inheritance hierarchy:
 *   markup (base) -> xml -> ooxml (PPTX-specific)
 */

// =============================================================================
// AST Types (new parser output)
// =============================================================================

export type { XmlElement, XmlText, XmlNode, XmlDocument } from "./ast";
export {
  isXmlElement,
  isXmlText,
  isXmlDocument,
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
export { getXmlText } from "./types";

// =============================================================================
// Parser
// =============================================================================

export { parseXml } from "./parser";

// =============================================================================
// Markup Compatibility (ECMA-376 Part 3)
// =============================================================================

export type { MarkupCompatibilityOptions } from "./markup-compatibility";
export { applyMarkupCompatibility } from "./markup-compatibility";

// =============================================================================
// Escape / Decode Utilities
// =============================================================================

export type { XmlString } from "./escape";
export { escapeXml, decodeXmlEntities, unsafeXml, emptyXml } from "./escape";

// =============================================================================
// String Utilities
// =============================================================================

export {
  stripCdata,
  escapeTab,
  escapeSpace,
  escapeWhitespace,
  trimTrailingSemicolon,
  getBasename,
  normalizePptPath,
  replaceDspNamespace,
} from "./string-utils";
