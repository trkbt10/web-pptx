/**
 * @file No-op grouping strategy that preserves PDF text structure.
 *
 * This is the default strategy that maintains backward compatibility
 * by creating one GroupedText per PdfText (no actual grouping).
 */

import type { PdfText } from "../../domain";
import type { GroupedText, TextGroupingStrategy } from "./types";

/**
 * Default grouping strategy that performs no grouping.
 *
 * Each PdfText becomes its own GroupedText, resulting in
 * one TextBox per text element (current behavior).
 */
export class NoGroupingStrategy implements TextGroupingStrategy {
  group(texts: readonly PdfText[]): readonly GroupedText[] {
    return texts.map((text) => ({
      bounds: {
        x: text.x,
        y: text.y,
        width: text.width,
        height: text.height,
      },
      paragraphs: [
        {
          runs: [text],
          baselineY: text.y + text.height, // Approximate baseline
        },
      ],
    }));
  }
}
