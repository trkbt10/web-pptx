/**
 * @file WebGL 3D Text Renderer
 *
 * Main rendering logic for 3D text using Three.js.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import * as THREE from "three";
import type { Scene3d, Shape3d, LightRig, PresetCameraType } from "../../../domain";
import { createCameraConfig, createCamera, type CameraConfig } from "./camera";
import { createLightingConfig, addLightsToScene, type LightConfig } from "./lighting";
import {
  createMaterialConfig,
  createMaterial,
  createExtrusionMaterial,
  createBevelMaterial,
  parseColor,
} from "./materials";
import {
  textToShapes,
  getBevelConfig,
  createExtrudedGeometry,
  centerGeometry,
  scaleGeometryToFit,
} from "./geometry";

// =============================================================================
// Renderer Types
// =============================================================================

export type Text3DRenderConfig = {
  /** Text content to render */
  readonly text: string;
  /** Text color (hex string with #) */
  readonly color: string;
  /** Font size in pixels */
  readonly fontSize: number;
  /** Font family */
  readonly fontFamily: string;
  /** Font weight */
  readonly fontWeight: number;
  /** Font style */
  readonly fontStyle: "normal" | "italic";
  /** 3D scene configuration */
  readonly scene3d?: Scene3d;
  /** 3D shape configuration */
  readonly shape3d?: Shape3d;
  /** Render width in pixels */
  readonly width: number;
  /** Render height in pixels */
  readonly height: number;
  /** Device pixel ratio */
  readonly pixelRatio: number;
};

export type Text3DRenderer = {
  /** Render a frame */
  render(): void;
  /** Update configuration */
  update(config: Partial<Text3DRenderConfig>): void;
  /** Dispose resources */
  dispose(): void;
  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement;
};

// =============================================================================
// Renderer Implementation
// =============================================================================

/**
 * Create a WebGL 3D text renderer
 */
export function createText3DRenderer(config: Text3DRenderConfig): Text3DRenderer {
  // Create Three.js scene
  const scene = new THREE.Scene();
  scene.background = null; // Transparent background

  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(config.width, config.height);
  renderer.setPixelRatio(config.pixelRatio);
  renderer.setClearColor(0x000000, 0);

  // Create camera
  const cameraPreset: PresetCameraType = config.scene3d?.camera?.preset ?? "orthographicFront";
  const cameraConfig = createCameraConfig(
    cameraPreset,
    config.scene3d?.camera?.fov,
    config.scene3d?.camera?.zoom,
  );
  let camera = createCamera(cameraConfig, config.width, config.height);

  // Setup lighting
  const lightingConfig = createLightingConfig(config.scene3d?.lightRig);
  addLightsToScene(scene, lightingConfig);

  // Create 3D text mesh
  let textMesh = createTextMesh(config);
  scene.add(textMesh);

  // Position camera to fit text
  fitCameraToObject(camera, textMesh, cameraConfig);

  // Render function
  function render() {
    renderer.render(scene, camera);
  }

  // Update function
  function update(newConfig: Partial<Text3DRenderConfig>) {
    const mergedConfig = { ...config, ...newConfig };

    // Update size if changed
    if (
      newConfig.width !== undefined ||
      newConfig.height !== undefined ||
      newConfig.pixelRatio !== undefined
    ) {
      renderer.setSize(mergedConfig.width, mergedConfig.height);
      renderer.setPixelRatio(mergedConfig.pixelRatio);

      // Update camera aspect
      const newCameraConfig = createCameraConfig(
        mergedConfig.scene3d?.camera?.preset ?? "orthographicFront",
        mergedConfig.scene3d?.camera?.fov,
        mergedConfig.scene3d?.camera?.zoom,
      );
      camera = createCamera(newCameraConfig, mergedConfig.width, mergedConfig.height);
      fitCameraToObject(camera, textMesh, newCameraConfig);
    }

    // Recreate mesh if text properties changed
    if (
      newConfig.text !== undefined ||
      newConfig.color !== undefined ||
      newConfig.fontSize !== undefined ||
      newConfig.fontFamily !== undefined ||
      newConfig.fontWeight !== undefined ||
      newConfig.fontStyle !== undefined ||
      newConfig.shape3d !== undefined
    ) {
      scene.remove(textMesh);
      textMesh.geometry.dispose();
      if (Array.isArray(textMesh.material)) {
        textMesh.material.forEach((m) => m.dispose());
      } else {
        textMesh.material.dispose();
      }

      textMesh = createTextMesh(mergedConfig);
      scene.add(textMesh);
      fitCameraToObject(camera, textMesh, cameraConfig);
    }

    // Update lighting if changed
    if (newConfig.scene3d?.lightRig !== undefined) {
      // Remove existing lights
      scene.children
        .filter((child) => child instanceof THREE.Light)
        .forEach((light) => scene.remove(light));

      // Add new lights
      const newLightingConfig = createLightingConfig(mergedConfig.scene3d?.lightRig);
      addLightsToScene(scene, newLightingConfig);
    }

    // Update camera if changed
    if (newConfig.scene3d?.camera !== undefined) {
      const newCameraConfig = createCameraConfig(
        mergedConfig.scene3d?.camera?.preset ?? "orthographicFront",
        mergedConfig.scene3d?.camera?.fov,
        mergedConfig.scene3d?.camera?.zoom,
      );
      camera = createCamera(newCameraConfig, mergedConfig.width, mergedConfig.height);
      fitCameraToObject(camera, textMesh, newCameraConfig);
    }

    Object.assign(config, newConfig);
  }

  // Dispose function
  function dispose() {
    scene.remove(textMesh);
    textMesh.geometry.dispose();
    if (Array.isArray(textMesh.material)) {
      textMesh.material.forEach((m) => m.dispose());
    } else {
      textMesh.material.dispose();
    }

    renderer.dispose();
  }

  return {
    render,
    update,
    dispose,
    getCanvas: () => renderer.domElement,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create 3D text mesh from configuration
 */
function createTextMesh(config: Text3DRenderConfig): THREE.Mesh {
  // Convert text to shapes
  const shapes = textToShapes(
    config.text,
    config.fontSize,
    config.fontFamily,
    config.fontWeight,
    config.fontStyle,
  );

  // Get extrusion depth
  const extrusionDepth = config.shape3d?.extrusionHeight
    ? (config.shape3d.extrusionHeight as number)
    : config.fontSize * 0.2; // Default to 20% of font size

  // Get bevel configuration
  const bevelConfig = getBevelConfig(config.shape3d?.bevel);

  // Create extruded geometry
  const geometry = createExtrudedGeometry(shapes, extrusionDepth, bevelConfig);

  // Center geometry
  centerGeometry(geometry);

  // Scale to fit within bounds
  const maxDimension = Math.min(config.width, config.height) * 0.8 / 96; // 80% of smallest dimension
  scaleGeometryToFit(geometry, maxDimension * 2, maxDimension);

  // Create materials
  const baseColor = parseColor(config.color);
  const materialConfig = createMaterialConfig(config.shape3d?.preset, baseColor);
  const isWireframe = config.shape3d?.preset === "legacyWireframe";

  const material = createMaterial(materialConfig, isWireframe);

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

/**
 * Fit camera to object bounds
 */
function fitCameraToObject(
  camera: THREE.Camera,
  object: THREE.Object3D,
  config: CameraConfig,
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Calculate distance to fit object
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = config.fov * (Math.PI / 180);
  let distance: number;

  if (camera instanceof THREE.PerspectiveCamera) {
    distance = maxDim / (2 * Math.tan(fov / 2));
  } else {
    // Orthographic camera
    distance = maxDim * 2;

    if (camera instanceof THREE.OrthographicCamera) {
      const aspect = (camera.right - camera.left) / (camera.top - camera.bottom);
      const viewHeight = maxDim * 1.5;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.updateProjectionMatrix();
    }
  }

  // Position camera
  const direction = config.position.clone().normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance * 1.5));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

/**
 * Check if 3D effects should be applied
 */
export function shouldUseWebGL3D(scene3d?: Scene3d, shape3d?: Shape3d): boolean {
  // Use WebGL if:
  // - There's significant extrusion depth
  // - There's bevel effect
  // - There's a non-flat material
  // - Camera is not orthographic front

  if (shape3d?.extrusionHeight && (shape3d.extrusionHeight as number) > 0) {
    return true;
  }

  if (shape3d?.bevel) {
    return true;
  }

  if (shape3d?.preset && shape3d.preset !== "flat") {
    return true;
  }

  if (scene3d?.camera?.preset && scene3d.camera.preset !== "orthographicFront") {
    return true;
  }

  return false;
}
