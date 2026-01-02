/**
 * @file HTML escaping utilities
 * HTML-specific escape functions
 */

import type { HtmlString } from "./types";
import {
  escapeContent as baseEscapeContent,
  unsafeMarkup,
  emptyMarkup,
} from "../markup";

/**
 * Escape text for safe inclusion in HTML content.
 */
export function escapeHtml(text: string): HtmlString {
  return baseEscapeContent(text);
}

/**
 * Mark a string as safe HTML without escaping.
 * Use only for trusted content.
 */
export function unsafeHtml(html: string): HtmlString {
  return unsafeMarkup(html);
}

/**
 * Create an empty HTML string.
 */
export function emptyHtml(): HtmlString {
  return emptyMarkup();
}
