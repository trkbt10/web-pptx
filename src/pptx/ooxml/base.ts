/**
 * @file Base types for OOXML elements
 *
 * These types describe the expected structure of OOXML elements.
 * They serve as documentation and provide type hints for element access.
 *
 * In the new AST model, all elements are XmlElement instances accessed via:
 * - getChild(element, "name") - get child by name
 * - getChildren(element, "name") - get all children by name
 * - element.attrs["name"] - get attribute value
 * - getTextContent(element) - get text content
 */

import type { XmlElement } from "../../xml";

/**
 * Base attributes type for OOXML elements.
 */
export type OoxmlAttrs<T extends Record<string, string> = Record<string, string>> = T;

/**
 * Base type for an OOXML element.
 * All elements have optional `attrs` for XML attributes.
 */
export type OoxmlElement<TAttrs extends Record<string, string> = Record<string, string>> = {
  attrs?: OoxmlAttrs<TAttrs>;
};

/**
 * An OOXML element that contains text content.
 * In the new model, use getTextContent() to access the text.
 *
 * Accepts either XmlElement (from AST parser) or legacy OoxmlElement format.
 * Use getXmlText() to extract text content from either format.
 *
 * @example
 * ```xml
 * <a:t>Hello World</a:t>
 * ```
 * Access: getTextContent(element) or getXmlText(element)
 * @see ECMA-376 Part 1, Section 21.1.2.3.12 (a:t - Text)
 */
export type OoxmlTextElement = XmlElement | OoxmlElement;

/**
 * Value attribute element - common pattern for elements with just a `val` attribute.
 *
 * @example
 * ```xml
 * <a:alpha val="50000"/>
 * <a:shade val="75000"/>
 * ```
 */
export type OoxmlValAttrs = {
  val: string;
};

/**
 * Element with a single `val` attribute.
 * Many OOXML elements follow this pattern.
 */
export type OoxmlValElement = OoxmlElement<OoxmlValAttrs>;

/**
 * Reference element with r:id attribute (for relationships).
 *
 * @example
 * ```xml
 * <a:blip r:embed="rId2"/>
 * <c:chart r:id="rId3"/>
 * ```
 */
export type OoxmlRefAttrs = {
  "r:embed"?: string;
  "r:id"?: string;
};

/**
 * Index attribute element - for referencing items by index.
 *
 * @example
 * ```xml
 * <c:pt idx="0">...</c:pt>
 * ```
 */
export type OoxmlIdxAttrs = {
  idx: string;
};

/**
 * Position/offset attributes (EMU units).
 *
 * @example
 * ```xml
 * <a:off x="914400" y="914400"/>
 * ```
 */
export type OoxmlOffsetAttrs = {
  x: string;
  y: string;
};

/**
 * Extent/size attributes (EMU units).
 *
 * @example
 * ```xml
 * <a:ext cx="914400" cy="914400"/>
 * ```
 */
export type OoxmlExtentAttrs = {
  cx: string;
  cy: string;
};

/**
 * Helper type to extract element from a parent node.
 * Handles both single element and array of elements.
 */
export type OoxmlChild<T> = T | T[] | undefined;

/**
 * Utility to get element as array (handles both single and array cases).
 * In the new model, use getChildren() instead for XmlElement arrays.
 */
export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
