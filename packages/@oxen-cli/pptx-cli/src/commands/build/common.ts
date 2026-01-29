/**
 * @file Common utilities for building PPTX elements
 */

import type { SpShape } from "@oxen-office/pptx/domain/shape";
import type { Pixels } from "@oxen-office/ooxml/domain/units";

/**
 * Generate a unique shape ID
 */
export function generateShapeId(existingIds: readonly string[]): string {
  const maxId = existingIds.reduce((max, id) => {
    const num = parseInt(id, 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return String(maxId + 1);
}

/**
 * Build a solid fill object
 */
export function buildSolidFill(hexColor: string): SpShape["properties"]["fill"] {
  return {
    type: "solidFill",
    color: { spec: { type: "srgb", value: hexColor } },
  };
}

/**
 * Build a line object
 */
export function buildLine(lineColor: string, lineWidth: number): SpShape["properties"]["line"] {
  return {
    width: lineWidth as Pixels,
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: { type: "solidFill", color: { spec: { type: "srgb", value: lineColor } } },
    dash: "solid",
    join: "round",
  };
}

/**
 * Build a text body object
 */
export function buildTextBody(text: string): SpShape["textBody"] {
  return {
    bodyProperties: {},
    paragraphs: [{ properties: {}, runs: [{ type: "text", text }] }],
  };
}
