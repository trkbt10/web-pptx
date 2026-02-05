/**
 * @file Stencil-based clipping and masking for WebGL
 *
 * Uses the stencil buffer for:
 * - Clip paths (draw clip geometry to stencil, test when drawing content)
 * - Even-odd fill rule (stencil invert operation)
 */

import type { ClipShape, PathContour } from "../scene-graph/types";
import { generateRectVertices, tessellateContours } from "./tessellation";

/**
 * Begin a stencil clip region
 *
 * Draws the clip shape into the stencil buffer, then enables stencil testing
 * so only pixels inside the clip shape are rendered.
 *
 * @param gl - WebGL context
 * @param clip - Clip shape to apply
 * @param positionBuffer - Shared position buffer
 * @param drawVertices - Function to upload and draw vertices
 */
export function beginStencilClip(
  gl: WebGLRenderingContext,
  clip: ClipShape,
  positionBuffer: WebGLBuffer,
  drawVertices: (vertices: Float32Array) => void
): void {
  // Enable stencil test
  gl.enable(gl.STENCIL_TEST);

  // Clear stencil buffer
  gl.clear(gl.STENCIL_BUFFER_BIT);

  // Draw clip shape into stencil buffer
  gl.stencilFunc(gl.ALWAYS, 1, 0xff);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

  // Disable color writes (only write to stencil)
  gl.colorMask(false, false, false, false);

  // Generate and draw clip geometry
  let vertices: Float32Array;

  if (clip.type === "rect") {
    vertices = generateRectVertices(clip.width, clip.height, clip.cornerRadius);
  } else {
    vertices = tessellateContours(clip.contours);
  }

  drawVertices(vertices);

  // Restore color writes
  gl.colorMask(true, true, true, true);

  // Set stencil test to only pass where stencil is 1
  gl.stencilFunc(gl.EQUAL, 1, 0xff);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
}

/**
 * End a stencil clip region
 */
export function endStencilClip(gl: WebGLRenderingContext): void {
  gl.disable(gl.STENCIL_TEST);
}

/**
 * Draw with even-odd fill rule using stencil inversion
 *
 * For each triangle, invert the stencil value. After all triangles are drawn,
 * only pixels covered an odd number of times have stencil value 1.
 *
 * @param gl - WebGL context
 * @param drawGeometry - Function that draws the fill geometry
 * @param drawQuad - Function that draws a bounding quad for final composite
 */
export function drawEvenOddFill(
  gl: WebGLRenderingContext,
  drawGeometry: () => void,
  drawQuad: () => void
): void {
  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);

  // Phase 1: Draw geometry, invert stencil
  gl.stencilFunc(gl.ALWAYS, 0, 0xff);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
  gl.colorMask(false, false, false, false);

  drawGeometry();

  // Phase 2: Draw bounding quad where stencil is odd
  gl.colorMask(true, true, true, true);
  gl.stencilFunc(gl.NOTEQUAL, 0, 0x01); // Test odd bit
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

  drawQuad();

  gl.disable(gl.STENCIL_TEST);
}
