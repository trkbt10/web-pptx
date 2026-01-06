/**
 * @file DrawingML tests barrel export
 *
 * Tests are organized by category:
 * - core/  : Core DrawingML features (mode-agnostic)
 * - svg/   : SVG mode tests (2D rendering)
 * - webgl/ : WebGL mode tests (3D rendering)
 */

// Common utilities
export { testSlideSize, testColorContext } from "./common";

// Route definitions
export * from "./routes";

// Core DrawingML tests
export * from "./core";

// SVG Mode tests
export * from "./svg";

// WebGL Mode tests
export * from "./webgl";
