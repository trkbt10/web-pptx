/**
 * @file HTML type definitions
 * HTML-specific types extending base markup types
 */

import type { MarkupString, MarkupChild, AttrValue } from "../markup/types";
import type { CssString } from "../css/types";

/**
 * HTML string type (alias of MarkupString for semantic clarity).
 */
export type HtmlString = MarkupString;

/**
 * HTML child type (alias of MarkupChild).
 */
export type HtmlChild = MarkupChild;

/**
 * HTML attribute value type.
 */
export type HtmlAttrValue = AttrValue;

/**
 * HTML element properties.
 */
export type HtmlElementProps = {
  className?: string | string[];
  style?: CssString;
  [key: string]: HtmlAttrValue | string[] | CssString;
};
