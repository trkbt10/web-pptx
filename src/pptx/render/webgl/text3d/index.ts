/**
 * @file WebGL 3D Text Rendering Module
 *
 * Provides true 3D text rendering using Three.js WebGL.
 *
 * ## Features
 *
 * - Camera presets (isometric, perspective, oblique)
 * - Light rigs (3-point, balanced, harsh, etc.)
 * - Materials (plastic, metal, matte, etc.)
 * - Bevel effects (angle, circle, convex, etc.)
 * - Extrusion depth
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// React component
export { Text3DRenderer, shouldRender3DText } from "./Text3DRenderer";
export type { Text3DRendererProps } from "./Text3DRenderer";

// Renderer
export { createText3DRenderer, shouldUseWebGL3D } from "./renderer";
export type { Text3DRenderer as IText3DRenderer, Text3DRenderConfig } from "./renderer";

// Camera
export { createCameraConfig, createCamera } from "./camera";
export type { CameraConfig } from "./camera";

// Lighting
export { createLightingConfig, addLightsToScene } from "./lighting";
export type { LightConfig } from "./lighting";

// Materials
export {
  createMaterialConfig,
  createMaterial,
  createExtrusionMaterial,
  createBevelMaterial,
  parseColor,
  rgbToHex,
} from "./materials";
export type { MaterialConfig } from "./materials";

// Geometry
export {
  textToShapes,
  getBevelConfig,
  createExtrudedGeometry,
  centerGeometry,
  scaleGeometryToFit,
} from "./geometry";
export type { TextGeometryConfig, BevelConfig } from "./geometry";
