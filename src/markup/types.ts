/**
 * @file Markup type definitions
 * Base types for XML-like markup languages (XML, HTML, SVG, etc.)
 */

/**
 * Branded string type for safe markup content.
 * Prevents mixing raw strings with escaped/safe markup.
 */
export type MarkupString = string & { readonly __brand: "MarkupString" };

/**
 * Valid child types for markup elements.
 * Supports nested elements via recursive array type.
 */
export type MarkupChild = MarkupString | MarkupChild[];

/**
 * Valid attribute value types.
 */
export type AttrValue = string | number | boolean | undefined;

/**
 * Element properties/attributes.
 */
export type ElementProps = {
  [key: string]: AttrValue | string[] | MarkupString;
};
