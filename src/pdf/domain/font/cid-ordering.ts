/**
 * @file CID Ordering fallback mappings
 *
 * Provides basic CID-to-Unicode fallback mappings for CID fonts
 * when ToUnicode CMap is not available.
 *
 * PDF Reference 5.6.1 - CIDSystemInfo Dictionary
 *
 * ## Background
 *
 * CID fonts use character identifiers (CIDs) rather than character codes.
 * The mapping from CID to Unicode is typically provided via ToUnicode CMap.
 * When ToUnicode is missing, we can use standard Adobe mappings based on
 * the font's CIDSystemInfo Ordering field.
 *
 * ## Limitations
 *
 * Full CID-to-Unicode mappings contain thousands of entries. This module
 * provides a minimal fallback for common character ranges:
 * - ASCII-compatible range (CID 1-94 for most orderings)
 * - Common punctuation and symbols
 *
 * For complete mappings, external CMap files would be needed.
 */

import type { CIDOrdering } from "./types";

/**
 * CID-to-Unicode fallback mapping
 */
export type CIDFallbackMapping = ReadonlyMap<number, string>;

/**
 * ASCII range mapping (CID 1-94 maps to U+0021-U+007E in most orderings)
 *
 * This covers basic Latin characters which are commonly at these CID positions
 * in Adobe's character collections.
 */
const ASCII_OFFSET_MAPPING: CIDFallbackMapping = (() => {
  const map = new Map<number, string>();
  // CID 1 typically maps to U+0020 (space) in Adobe orderings
  // CID 2-95 maps to U+0021-U+007E (printable ASCII)
  for (let cid = 1; cid <= 95; cid++) {
    map.set(cid, String.fromCodePoint(0x001f + cid)); // CID 1 -> U+0020
  }
  return map;
})();

/**
 * Japan1 specific common mappings
 *
 * Adobe-Japan1 ordering has well-defined mappings for:
 * - CID 0: .notdef (not mapped)
 * - CID 1-94: Half-width ASCII
 * - CID 231-325: Full-width ASCII (mapped to half-width equivalents)
 * - CID 633-695: Half-width katakana
 */
const JAPAN1_EXTRA_MAPPINGS: CIDFallbackMapping = (() => {
  const map = new Map<number, string>();

  // Full-width ASCII to Unicode (CID 231-325 -> U+FF01-U+FF5E)
  // These are full-width forms but we map to standard ASCII for compatibility
  for (let i = 0; i <= 94; i++) {
    map.set(231 + i, String.fromCodePoint(0x0021 + i));
  }

  // Half-width katakana (CID 633-695 -> U+FF61-U+FF9F)
  for (let i = 0; i <= 62; i++) {
    map.set(633 + i, String.fromCodePoint(0xff61 + i));
  }

  return map;
})();

/**
 * Get fallback mapping for a given CID ordering
 *
 * Returns a combined mapping of ASCII range plus ordering-specific mappings.
 */
export function getCIDFallbackMapping(ordering: CIDOrdering): CIDFallbackMapping {
  const combined = new Map<number, string>(ASCII_OFFSET_MAPPING);

  switch (ordering) {
    case "Japan1":
      for (const [k, v] of JAPAN1_EXTRA_MAPPINGS) {
        combined.set(k, v);
      }
      break;
    case "GB1":
    case "CNS1":
    case "Korea1":
      // These orderings share similar ASCII range mappings
      // Additional ordering-specific mappings could be added here
      break;
  }

  return combined;
}

/**
 * Detect CID ordering from font ordering string
 *
 * The Ordering string in CIDSystemInfo typically contains the ordering name.
 */
export function detectCIDOrdering(ordering: string): CIDOrdering | null {
  const normalized = ordering.toLowerCase();

  if (normalized.includes("japan")) return "Japan1";
  if (normalized.includes("gb")) return "GB1";
  if (normalized.includes("cns")) return "CNS1";
  if (normalized.includes("korea") || normalized.includes("ksc")) return "Korea1";

  return null;
}

/**
 * Try to decode a CID using fallback mapping
 *
 * Returns the Unicode character if found, or null if no mapping exists.
 */
export function decodeCIDFallback(
  cid: number,
  ordering: CIDOrdering | null
): string | null {
  // CID 0 is .notdef (no glyph)
  if (cid === 0) return null;

  // Try ASCII range first (most common case)
  const asciiChar = ASCII_OFFSET_MAPPING.get(cid);
  if (asciiChar) return asciiChar;

  // Try ordering-specific mappings
  if (ordering) {
    const orderingMap = getCIDFallbackMapping(ordering);
    const orderingChar = orderingMap.get(cid);
    if (orderingChar) return orderingChar;
  }

  return null;
}
