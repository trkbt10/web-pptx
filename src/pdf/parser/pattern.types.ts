/**
 * @file src/pdf/parser/pattern.types.ts
 *
 * Parsed `/Pattern` resource types (subset).
 *
 * Initial supported subset:
 * - PatternType 2 (shading patterns)
 */

import type { PdfMatrix } from "../domain";
import type { PdfShading } from "./shading.types";

export type PdfShadingPattern = Readonly<{
  readonly patternType: 2;
  readonly matrix: PdfMatrix;
  readonly shading: PdfShading;
}>;

export type PdfPattern = PdfShadingPattern;

