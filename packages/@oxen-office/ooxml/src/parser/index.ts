/**
 * @file OOXML parser public exports
 *
 * Note: DrawingML parsing functions have been moved to @oxen-office/drawing-ml/parser.
 * Primitive parsing functions have been moved to @oxen-office/drawing-ml/parser.
 */

export type { OoxmlTextReader } from "./relationships";
export {
  resolvePartPath,
  getRelationshipPath,
  parseRelationships,
  parseRelationshipsFromText,
  loadRelationships,
} from "./relationships";
