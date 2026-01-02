/**
 * @file HTML module exports
 */

// Types
export type {
  HtmlString,
  HtmlChild,
  HtmlAttrValue,
  HtmlElementProps,
} from "./types";

// Escape utilities
export { escapeHtml, unsafeHtml, emptyHtml } from "./escape";

// Element building
export { createElement, fragment, mapJoin } from "./element";
