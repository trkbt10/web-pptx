/**
 * @file WebGL effects rendering
 *
 * Implements drop shadow, inner shadow, and layer blur using FBOs
 * and multi-pass rendering.
 */

import type { Effect, DropShadowEffect, InnerShadowEffect, LayerBlurEffect } from "../scene-graph/types";
import type { Framebuffer } from "./framebuffer";
import { createFramebuffer, deleteFramebuffer, bindFramebuffer } from "./framebuffer";

/**
 * Gaussian blur shader (separable 2-pass)
 */
export const gaussianBlurVertexShader = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`;

export const gaussianBlurFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec2 u_direction;
  uniform vec2 u_texelSize;
  uniform float u_radius;

  varying vec2 v_texCoord;

  void main() {
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;

    // 9-tap Gaussian kernel
    for (float i = -4.0; i <= 4.0; i += 1.0) {
      float weight = exp(-0.5 * (i * i) / max(u_radius * 0.5, 0.5));
      vec2 offset = u_direction * u_texelSize * i * u_radius * 0.25;
      color += texture2D(u_texture, v_texCoord + offset) * weight;
      totalWeight += weight;
    }

    gl_FragColor = color / totalWeight;
  }
`;

/**
 * Compositing shader for shadow overlay
 */
export const compositeVertexShader = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`;

export const compositeFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec4 u_color;
  uniform vec2 u_offset;
  uniform vec2 u_texelSize;

  varying vec2 v_texCoord;

  void main() {
    float alpha = texture2D(u_texture, v_texCoord + u_offset * u_texelSize).a;
    gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
  }
`;

/**
 * Effects renderer state
 */
export class EffectsRenderer {
  private gl: WebGLRenderingContext;
  private blurProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;
  private fullscreenQuad: WebGLBuffer | null = null;
  private tempFBO1: Framebuffer | null = null;
  private tempFBO2: Framebuffer | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /**
   * Apply a Gaussian blur to a framebuffer texture
   *
   * Uses a separable 2-pass approach (horizontal + vertical).
   *
   * @param source - Source framebuffer to blur
   * @param radius - Blur radius in pixels
   * @returns Blurred framebuffer (caller must not delete source)
   */
  applyGaussianBlur(source: Framebuffer, radius: number): Framebuffer {
    const gl = this.gl;
    this.ensureResources(source.width, source.height);

    const target1 = this.tempFBO1!;
    const target2 = this.tempFBO2!;

    // Pass 1: Horizontal blur (source → target1)
    bindFramebuffer(gl, target1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawBlurPass(source.texture, source.width, source.height, 1, 0, radius);

    // Pass 2: Vertical blur (target1 → target2)
    bindFramebuffer(gl, target2);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawBlurPass(target1.texture, target1.width, target1.height, 0, 1, radius);

    // Restore default framebuffer
    bindFramebuffer(gl, null);

    return target2;
  }

  private drawBlurPass(
    sourceTexture: WebGLTexture,
    width: number,
    height: number,
    dirX: number,
    dirY: number,
    radius: number
  ): void {
    const gl = this.gl;
    const program = this.blurProgram!;
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    gl.uniform2f(gl.getUniformLocation(program, "u_direction"), dirX, dirY);
    gl.uniform2f(gl.getUniformLocation(program, "u_texelSize"), 1.0 / width, 1.0 / height);
    gl.uniform1f(gl.getUniformLocation(program, "u_radius"), radius);

    this.drawFullscreenQuad(program);
  }

  private drawFullscreenQuad(program: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenQuad!);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private ensureResources(width: number, height: number): void {
    const gl = this.gl;

    if (!this.blurProgram) {
      this.blurProgram = this.compileProgram(gaussianBlurVertexShader, gaussianBlurFragmentShader);
    }

    if (!this.compositeProgram) {
      this.compositeProgram = this.compileProgram(compositeVertexShader, compositeFragmentShader);
    }

    if (!this.fullscreenQuad) {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      this.fullscreenQuad = buffer;
    }

    // Recreate FBOs if size changed
    if (!this.tempFBO1 || this.tempFBO1.width !== width || this.tempFBO1.height !== height) {
      if (this.tempFBO1) deleteFramebuffer(gl, this.tempFBO1);
      if (this.tempFBO2) deleteFramebuffer(gl, this.tempFBO2);
      this.tempFBO1 = createFramebuffer(gl, width, height);
      this.tempFBO2 = createFramebuffer(gl, width, height);
    }
  }

  private compileProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    return program;
  }

  /**
   * Dispose all GPU resources
   */
  dispose(): void {
    const gl = this.gl;
    if (this.blurProgram) gl.deleteProgram(this.blurProgram);
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);
    if (this.fullscreenQuad) gl.deleteBuffer(this.fullscreenQuad);
    if (this.tempFBO1) deleteFramebuffer(gl, this.tempFBO1);
    if (this.tempFBO2) deleteFramebuffer(gl, this.tempFBO2);
  }
}
