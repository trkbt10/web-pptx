/**
 * @file XML escaping utilities
 * XML-specific escape functions, extending markup base
 *
 * Inherits from markup module and re-exports for XML context.
 * OOXML module inherits from this module.
 */

import type { MarkupString } from "../markup/types";
import {
  escapeXml as baseEscapeXml,
  decodeXmlEntities as baseDecodeXmlEntities,
  unsafeMarkup,
  emptyMarkup,
} from "../markup";

// =============================================================================
// XML String Type
// =============================================================================

/**
 * Branded string type for safe XML content.
 * Inherits from MarkupString.
 */
export type XmlString = MarkupString & { readonly __xmlBrand?: "XmlString" };

// =============================================================================
// Escape Functions
// =============================================================================

/**
 * Escape XML special characters.
 * Escapes &, <, >, ", and ' for safe inclusion in XML content or attributes.
 */
export function escapeXml(text: string): XmlString {
  return baseEscapeXml(text) as XmlString;
}

/**
 * Decode XML entities in text content.
 * Handles named entities (&lt; &gt; &amp; &apos; &quot;)
 * and numeric entities (&#123; &#x7B;).
 */
export const decodeXmlEntities = baseDecodeXmlEntities;

/**
 * Mark a string as safe XML without escaping.
 * Use only for trusted content.
 */
export function unsafeXml(xml: string): XmlString {
  return unsafeMarkup(xml) as XmlString;
}

/**
 * Create an empty XML string.
 */
export function emptyXml(): XmlString {
  return emptyMarkup() as XmlString;
}
