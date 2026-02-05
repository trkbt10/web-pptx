/**
 * @file WebGL Figma Renderer
 *
 * Renders a SceneGraph to a WebGL canvas. Supports solid fills, gradients,
 * images, clipping, strokes, and glyph outlines through tessellation.
 */

import type {
  SceneGraph,
  SceneNode,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  ImageNode,
  AffineMatrix,
  Fill,
  Color,
} from "../scene-graph/types";
import { ShaderCache } from "./shaders";
import {
  generateRectVertices,
  generateEllipseVertices,
  tessellateContours,
} from "./tessellation";
import {
  drawSolidFill,
  drawLinearGradientFill,
  drawRadialGradientFill,
  drawImageFill,
  type GLContext,
} from "./fill-renderer";
import { TextureCache } from "./texture-cache";
import { beginStencilClip, endStencilClip } from "./clip-mask";
import {
  tessellateRectStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";
import { renderFallbackTextToCanvas } from "./text-renderer";

// =============================================================================
// Types
// =============================================================================

export type WebGLRendererOptions = {
  /** WebGL canvas element or rendering context */
  readonly canvas: HTMLCanvasElement;
  /** Device pixel ratio (default: window.devicePixelRatio) */
  readonly pixelRatio?: number;
  /** Antialias (default: true) */
  readonly antialias?: boolean;
  /** Background color (default: white) */
  readonly backgroundColor?: Color;
};

// =============================================================================
// Matrix Utilities
// =============================================================================

/**
 * Multiply two 3x3 affine matrices (stored as AffineMatrix)
 * Result = a * b
 */
function multiplyMatrices(a: AffineMatrix, b: AffineMatrix): AffineMatrix {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12,
  };
}

const IDENTITY_MATRIX: AffineMatrix = {
  m00: 1, m01: 0, m02: 0,
  m10: 0, m11: 1, m12: 0,
};

// =============================================================================
// WebGL Renderer
// =============================================================================

export class WebGLFigmaRenderer {
  private gl: WebGLRenderingContext;
  private shaders: ShaderCache;
  private width: number = 0;
  private height: number = 0;
  private pixelRatio: number;
  private positionBuffer: WebGLBuffer;
  private backgroundColor: Color;
  private textureCache: TextureCache;

  constructor(options: WebGLRendererOptions) {
    const gl = options.canvas.getContext("webgl", {
      antialias: options.antialias ?? true,
      alpha: true,
      premultipliedAlpha: false,
      stencil: true,
    });

    if (!gl) {
      throw new Error("WebGL not supported");
    }

    this.gl = gl;
    this.pixelRatio = options.pixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio : 1);
    this.shaders = new ShaderCache(gl);
    this.backgroundColor = options.backgroundColor ?? { r: 1, g: 1, b: 1, a: 1 };
    this.textureCache = new TextureCache(gl);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Failed to create buffer");
    }
    this.positionBuffer = buffer;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private get glContext(): GLContext {
    return {
      gl: this.gl,
      shaders: this.shaders,
      positionBuffer: this.positionBuffer,
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
    };
  }

  /**
   * Pre-load textures for all image fills in the scene graph.
   * Must be called before render() for image fills to display.
   */
  async prepareScene(scene: SceneGraph): Promise<void> {
    await this.walkForImages(scene.root);
  }

  private async walkForImages(node: SceneNode): Promise<void> {
    if (node.type === "image") {
      await this.textureCache.getOrCreate(node.imageRef, node.data, node.mimeType);
    }

    if ("fills" in node) {
      for (const fill of node.fills) {
        if (fill.type === "image") {
          await this.textureCache.getOrCreate(fill.imageRef, fill.data, fill.mimeType);
        }
      }
    }

    if ("children" in node) {
      for (const child of node.children) {
        await this.walkForImages(child);
      }
    }
  }

  /**
   * Render a scene graph to the WebGL canvas
   */
  render(scene: SceneGraph): void {
    const gl = this.gl;

    // Update canvas size
    this.width = scene.width;
    this.height = scene.height;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = scene.width * this.pixelRatio;
    canvas.height = scene.height * this.pixelRatio;
    canvas.style.width = `${scene.width}px`;
    canvas.style.height = `${scene.height}px`;

    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear
    const bg = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // Render scene tree
    this.renderNode(scene.root, IDENTITY_MATRIX, 1);
  }

  /**
   * Render a single node recursively
   */
  private renderNode(
    node: SceneNode,
    parentTransform: AffineMatrix,
    parentOpacity: number
  ): void {
    if (!node.visible) return;

    const worldTransform = multiplyMatrices(parentTransform, node.transform);
    const worldOpacity = parentOpacity * node.opacity;

    switch (node.type) {
      case "group":
        this.renderGroup(node, worldTransform, worldOpacity);
        break;
      case "frame":
        this.renderFrame(node, worldTransform, worldOpacity);
        break;
      case "rect":
        this.renderRect(node, worldTransform, worldOpacity);
        break;
      case "ellipse":
        this.renderEllipse(node, worldTransform, worldOpacity);
        break;
      case "path":
        this.renderPath(node, worldTransform, worldOpacity);
        break;
      case "text":
        this.renderText(node, worldTransform, worldOpacity);
        break;
      case "image":
        this.renderImage(node, worldTransform, worldOpacity);
        break;
    }
  }

  private renderGroup(node: GroupNode, transform: AffineMatrix, opacity: number): void {
    for (const child of node.children) {
      this.renderNode(child, transform, opacity);
    }
  }

  private renderFrame(node: FrameNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.width, height: node.height };

    // Render background
    if (node.fills.length > 0) {
      const fill = node.fills[node.fills.length - 1];
      const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);
      this.drawFill(vertices, fill, transform, opacity, elementSize);
    }

    // Render stroke
    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke(node.width, node.height, node.cornerRadius ?? 0, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }

    // Clipping
    if (node.clipsContent) {
      const clipShape = node.clip ?? {
        type: "rect" as const,
        width: node.width,
        height: node.height,
        cornerRadius: node.cornerRadius,
      };
      beginStencilClip(this.gl, clipShape, this.positionBuffer, (vertices) => {
        drawSolidFill(this.glContext, vertices, { r: 0, g: 0, b: 0, a: 1 }, transform, 1);
      });
    }

    // Render children
    for (const child of node.children) {
      this.renderNode(child, transform, opacity);
    }

    if (node.clipsContent) {
      endStencilClip(this.gl);
    }
  }

  private renderRect(node: RectNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.width, height: node.height };

    if (node.fills.length > 0) {
      const fill = node.fills[node.fills.length - 1];
      const vertices = generateRectVertices(node.width, node.height, node.cornerRadius);
      this.drawFill(vertices, fill, transform, opacity, elementSize);
    }

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateRectStroke(node.width, node.height, node.cornerRadius ?? 0, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }
  }

  private renderEllipse(node: EllipseNode, transform: AffineMatrix, opacity: number): void {
    const elementSize = { width: node.rx * 2, height: node.ry * 2 };

    if (node.fills.length > 0) {
      const fill = node.fills[node.fills.length - 1];
      const vertices = generateEllipseVertices(node.cx, node.cy, node.rx, node.ry);
      this.drawFill(vertices, fill, transform, opacity, elementSize);
    }

    if (node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellateEllipseStroke(node.cx, node.cy, node.rx, node.ry, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }
  }

  private renderPath(node: PathNode, transform: AffineMatrix, opacity: number): void {
    if (node.contours.length > 0 && node.fills.length > 0) {
      const fill = node.fills[node.fills.length - 1];
      const vertices = tessellateContours(node.contours);
      if (vertices.length > 0) {
        const elementSize = computeBoundingBox(vertices);
        this.drawFill(vertices, fill, transform, opacity, elementSize);
      }
    }

    if (node.contours.length > 0 && node.stroke && node.stroke.width > 0) {
      const strokeVerts = tessellatePathStroke(node.contours, node.stroke.width);
      if (strokeVerts.length > 0) {
        drawSolidFill(this.glContext, strokeVerts, node.stroke.color, transform, opacity * node.stroke.opacity);
      }
    }
  }

  private renderText(node: TextNode, transform: AffineMatrix, opacity: number): void {
    const ctx = this.glContext;
    const color = node.fill.color;
    const fillOpacity = node.fill.opacity;

    // Render glyph outlines as tessellated paths
    if (node.glyphContours && node.glyphContours.length > 0) {
      const vertices = tessellateContours(node.glyphContours);
      if (vertices.length > 0) {
        drawSolidFill(ctx, vertices, color, transform, opacity * fillOpacity);
      }
      return;
    }

    // Fallback: render text via Canvas 2D → texture
    if (node.fallbackText) {
      const textureKey = `__text_${node.id}`;
      let entry = this.textureCache.getIfCached(textureKey);

      if (!entry) {
        const canvas = renderFallbackTextToCanvas(node);
        if (canvas) {
          entry = this.textureCache.createFromCanvas(textureKey, canvas);
        }
      }

      if (entry) {
        const vertices = generateRectVertices(entry.width, entry.height);
        const elementSize = { width: entry.width, height: entry.height };
        drawImageFill(ctx, vertices, entry.texture, transform, opacity * fillOpacity, elementSize);
      }
    }

    // Render decorations (underlines, strikethroughs)
    if (node.decorationContours && node.decorationContours.length > 0) {
      const vertices = tessellateContours(node.decorationContours);
      if (vertices.length > 0) {
        drawSolidFill(ctx, vertices, color, transform, opacity * fillOpacity);
      }
    }
  }

  private renderImage(node: ImageNode, transform: AffineMatrix, opacity: number): void {
    const entry = this.textureCache.getIfCached(node.imageRef);
    if (!entry) return;

    const vertices = generateRectVertices(node.width, node.height);
    const elementSize = { width: node.width, height: node.height };
    drawImageFill(this.glContext, vertices, entry.texture, transform, opacity, elementSize);
  }

  // =============================================================================
  // Drawing Primitives
  // =============================================================================

  /**
   * Draw filled triangles using the appropriate shader
   */
  private drawFill(
    vertices: Float32Array,
    fill: Fill,
    transform: AffineMatrix,
    opacity: number,
    elementSize: { width: number; height: number }
  ): void {
    const ctx = this.glContext;

    switch (fill.type) {
      case "solid":
        drawSolidFill(ctx, vertices, fill.color, transform, opacity * fill.opacity);
        break;

      case "linear-gradient":
        drawLinearGradientFill(ctx, vertices, fill, transform, opacity, elementSize);
        break;

      case "radial-gradient":
        drawRadialGradientFill(ctx, vertices, fill, transform, opacity, elementSize);
        break;

      case "image": {
        const entry = this.textureCache.getIfCached(fill.imageRef);
        if (entry) {
          drawImageFill(ctx, vertices, entry.texture, transform, opacity * fill.opacity, elementSize);
        }
        break;
      }
    }
  }

  /**
   * Dispose all WebGL resources
   */
  dispose(): void {
    this.shaders.dispose();
    this.textureCache.dispose();
    this.gl.deleteBuffer(this.positionBuffer);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function computeBoundingBox(vertices: Float32Array): { width: number; height: number } {
  if (vertices.length === 0) return { width: 0, height: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}
