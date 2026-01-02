/**
 * @file Branded types for PPTX values
 * Using branded types prevents mixing up semantically different values
 */

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

// =============================================================================
// EMU (English Metric Units)
// =============================================================================

/**
 * EMU (English Metric Units) - the base unit in Office Open XML
 * 914400 EMU = 1 inch = 96 CSS pixels
 */
export type EMU = Brand<number, "EMU">;

/**
 * Create an EMU value from a number
 */
export function emu(value: number): EMU {
  return value as EMU;
}

// =============================================================================
// Relationship ID
// =============================================================================

/**
 * Relationship ID (rId1, rId2, etc.) used in .rels files
 */
export type RelationshipId = Brand<string, "RelationshipId">;

/**
 * Create a RelationshipId from a string
 */
export function rId(value: string): RelationshipId {
  return value as RelationshipId;
}

// =============================================================================
// Hex Color
// =============================================================================

/**
 * Hex color string (#RRGGBB or RRGGBB format)
 */
export type HexColor = Brand<string, "HexColor">;

/**
 * Create a HexColor from a string
 */
export function hexColor(value: string): HexColor {
  return value as HexColor;
}
