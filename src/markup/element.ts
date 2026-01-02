/**
 * @file Markup element builder
 * Generic element creation for XML-like markup languages
 */

import type { MarkupString, MarkupChild, AttrValue, ElementProps } from "./types";
import { escapeAttr, unsafeMarkup } from "./escape";

/**
 * Configuration for markup element creation.
 */
export type MarkupConfig = {
  /** Set of void/self-closing element names (lowercase) */
  voidElements?: ReadonlySet<string>;
  /** Attribute name transformations (e.g., className -> class) */
  attrTransforms?: Record<string, string>;
};

/**
 * Default configuration (no void elements, no transforms).
 */
const DEFAULT_CONFIG: MarkupConfig = {
  voidElements: new Set(),
  attrTransforms: {},
};

/**
 * Format an attribute value for output.
 */
function formatAttrValue(value: AttrValue): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

/**
 * Normalize array attribute values (like className arrays).
 */
function normalizeArrayAttr(value: unknown[]): string {
  return value
    .filter((v): v is string => typeof v === "string" && v !== "")
    .join(" ");
}

/**
 * Get string value from attribute.
 */
function getAttrValueString(value: unknown): string {
  if (Array.isArray(value)) {
    return normalizeArrayAttr(value);
  }
  return formatAttrValue(value as AttrValue);
}

/**
 * Build attributes string from props.
 */
function buildAttributes(props: ElementProps | null, config: MarkupConfig): string {
  if (props === null) {
    return "";
  }

  const transforms = config.attrTransforms ?? {};
  const parts: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) {
      continue;
    }

    // Boolean true renders as bare attribute
    if (value === true) {
      parts.push(` ${key}`);
      continue;
    }

    // Apply attribute name transformation
    const attrName = transforms[key] ?? key;

    // Get attribute value as string
    const attrValue = getAttrValueString(value);

    if (attrValue !== "") {
      parts.push(` ${attrName}='${escapeAttr(attrValue)}'`);
    }
  }

  return parts.join("");
}

/**
 * Flatten nested children arrays into a single string.
 */
function flattenChildren(children: MarkupChild[]): string {
  const result: string[] = [];

  for (const child of children) {
    if (Array.isArray(child)) {
      result.push(flattenChildren(child));
    } else {
      result.push(child as string);
    }
  }

  return result.join("");
}

/**
 * Create a markup element with the given configuration.
 */
export function createElementWithConfig(
  config: MarkupConfig,
  type: string,
  props: ElementProps | null,
  ...children: MarkupChild[]
): MarkupString {
  const attrs = buildAttributes(props, config);
  const isVoid = config.voidElements?.has(type.toLowerCase()) ?? false;

  if (isVoid) {
    return unsafeMarkup(`<${type}${attrs} />`);
  }

  const content = flattenChildren(children);
  return unsafeMarkup(`<${type}${attrs}>${content}</${type}>`);
}

/**
 * Create a generic markup element (no void elements, no transforms).
 */
export function createElement(
  type: string,
  props: ElementProps | null,
  ...children: MarkupChild[]
): MarkupString {
  return createElementWithConfig(DEFAULT_CONFIG, type, props, ...children);
}

/**
 * Create a fragment (multiple elements without wrapper).
 */
export function fragment(...children: MarkupChild[]): MarkupString {
  return unsafeMarkup(flattenChildren(children));
}

/**
 * Map items to markup and join them.
 */
export function mapJoin<T>(
  items: T[],
  mapper: (item: T, index: number) => MarkupString,
): MarkupString {
  return unsafeMarkup(items.map(mapper).join(""));
}

/**
 * Create a configured element factory.
 */
export function createElementFactory(config: MarkupConfig) {
  return (type: string, props: ElementProps | null, ...children: MarkupChild[]): MarkupString => {
    return createElementWithConfig(config, type, props, ...children);
  };
}
