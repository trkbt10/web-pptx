/**
 * @file HTML element builder
 * HTML-specific element creation using markup base
 */

import type { HtmlString, HtmlChild, HtmlElementProps } from "./types";
import type { MarkupConfig, ElementProps } from "../markup";
import { createElementWithConfig, fragment as baseFragment, mapJoin as baseMapJoin } from "../markup";

/**
 * HTML void elements (self-closing).
 */
const HTML_VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "source", "track", "wbr",
]);

/**
 * HTML attribute name transformations.
 */
const HTML_ATTR_TRANSFORMS: Record<string, string> = {
  className: "class",
};

/**
 * HTML-specific configuration.
 */
const HTML_CONFIG: MarkupConfig = {
  voidElements: HTML_VOID_ELEMENTS,
  attrTransforms: HTML_ATTR_TRANSFORMS,
};

/**
 * Create an HTML element.
 */
export function createElement(
  type: string,
  props: HtmlElementProps | null,
  ...children: HtmlChild[]
): HtmlString {
  return createElementWithConfig(HTML_CONFIG, type, props as ElementProps | null, ...children);
}

/**
 * Create an HTML fragment (multiple elements without wrapper).
 */
export function fragment(...children: HtmlChild[]): HtmlString {
  return baseFragment(...children);
}

/**
 * Map items to HTML and join them.
 */
export function mapJoin<T>(
  items: T[],
  mapper: (item: T, index: number) => HtmlString,
): HtmlString {
  return baseMapJoin(items, mapper);
}
