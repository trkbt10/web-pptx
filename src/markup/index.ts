/**
 * @file Markup module exports
 * Generic markup element building for XML-like languages
 */

// Types
export type {
  MarkupString,
  MarkupChild,
  AttrValue,
  ElementProps,
} from "./types";

// Escape utilities
export {
  escapeXml,
  escapeContent,
  escapeAttr,
  decodeXmlEntities,
  unsafeMarkup,
  emptyMarkup,
} from "./escape";

// Element building
export type { MarkupConfig } from "./element";
export {
  createElement,
  createElementWithConfig,
  createElementFactory,
  fragment,
  mapJoin,
} from "./element";
