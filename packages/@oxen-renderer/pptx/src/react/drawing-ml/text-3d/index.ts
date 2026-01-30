/**
 * @file Text 3D module exports
 *
 * SVG rendering for DrawingML 3D text effects.
 *
 * Re-exports format-agnostic components from @oxen-renderer/drawing-ml
 * and provides PPTX-specific implementations using PPTX 3D types.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// PPTX-specific implementations (use PPTX 3D types)
export { render3dTextEffects } from "./render-3d-effects";

/* eslint-disable custom/no-cross-package-reexport -- intentional re-export for backwards compatibility */
// Re-export format-agnostic components from drawing-ml
export {
  renderTextExtrusion,
  getExtrusionOffset,
  createTextBevelFilterDef,
  getBevelOffsets,
  type BevelConfig,
} from "@oxen-renderer/drawing-ml";
