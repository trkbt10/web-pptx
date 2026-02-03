/**
 * @file Paint builders with fluent API
 *
 * Provides builders for:
 * - Solid color fills
 * - Linear gradients
 * - Radial gradients
 * - Angular gradients
 * - Diamond gradients
 * - Image fills
 * - Strokes with various styles
 */

import type { Color, Paint } from "./text-builder";
import type { Stroke, StrokeCap, StrokeJoin, StrokeAlign } from "./shape-builder";

// =============================================================================
// Paint Type Values
// =============================================================================

export const PAINT_TYPE_VALUES = {
  SOLID: 0,
  GRADIENT_LINEAR: 1,
  GRADIENT_RADIAL: 2,
  GRADIENT_ANGULAR: 3,
  GRADIENT_DIAMOND: 4,
  IMAGE: 5,
  EMOJI: 6,
} as const;

export type PaintType = keyof typeof PAINT_TYPE_VALUES;

// =============================================================================
// Scale Mode Values (for image fills)
// =============================================================================

export const SCALE_MODE_VALUES = {
  FILL: 0,
  FIT: 1,
  CROP: 2,
  TILE: 3,
} as const;

export type ScaleMode = keyof typeof SCALE_MODE_VALUES;

// =============================================================================
// Blend Mode Values
// =============================================================================

export const BLEND_MODE_VALUES = {
  PASS_THROUGH: 0,
  NORMAL: 1,
  DARKEN: 2,
  MULTIPLY: 3,
  LINEAR_BURN: 4,
  COLOR_BURN: 5,
  LIGHTEN: 6,
  SCREEN: 7,
  LINEAR_DODGE: 8,
  COLOR_DODGE: 9,
  OVERLAY: 10,
  SOFT_LIGHT: 11,
  HARD_LIGHT: 12,
  DIFFERENCE: 13,
  EXCLUSION: 14,
  HUE: 15,
  SATURATION: 16,
  COLOR: 17,
  LUMINOSITY: 18,
} as const;

export type BlendMode = keyof typeof BLEND_MODE_VALUES;

// =============================================================================
// Gradient Stop
// =============================================================================

export type GradientStop = {
  readonly color: Color;
  readonly position: number; // 0-1
};

// =============================================================================
// Gradient Handle Positions
// =============================================================================

export type GradientHandles = {
  readonly start: { x: number; y: number }; // 0-1 normalized coordinates
  readonly end: { x: number; y: number };
  readonly width?: number; // For radial/angular gradients
};

// =============================================================================
// Extended Paint Types
// =============================================================================

export type GradientPaint = Paint & {
  readonly gradientStops: readonly GradientStop[];
  readonly gradientHandlePositions?: readonly { x: number; y: number }[];
};

export type ImagePaint = Paint & {
  readonly imageRef?: string;
  readonly scaleMode?: { value: number; name: ScaleMode };
  readonly imageTransform?: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly scalingFactor?: number;
  readonly rotation?: number;
  readonly filters?: {
    exposure?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    tint?: number;
    highlights?: number;
    shadows?: number;
  };
};

// =============================================================================
// Solid Color Paint Builder
// =============================================================================

export class SolidPaintBuilder {
  private _color: Color;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor(r: number, g: number, b: number, a: number = 1) {
    this._color = { r, g, b, a };
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): Paint {
    return {
      type: { value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" },
      color: this._color,
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
    };
  }
}

// =============================================================================
// Linear Gradient Paint Builder
// =============================================================================

export class LinearGradientBuilder {
  private _stops: GradientStop[];
  private _startX: number;
  private _startY: number;
  private _endX: number;
  private _endY: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    // Default: horizontal left to right
    this._stops = [
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 },
    ];
    this._startX = 0;
    this._startY = 0.5;
    this._endX = 1;
    this._endY = 0.5;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  /**
   * Set gradient stops
   */
  stops(stops: GradientStop[]): this {
    this._stops = stops;
    return this;
  }

  /**
   * Add a gradient stop
   */
  addStop(r: number, g: number, b: number, position: number, a: number = 1): this {
    this._stops.push({ color: { r, g, b, a }, position });
    this._stops.sort((a, b) => a.position - b.position);
    return this;
  }

  /**
   * Set gradient angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
   */
  angle(degrees: number): this {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Center at 0.5, 0.5, extend by 0.5 in each direction
    this._startX = 0.5 - cos * 0.5;
    this._startY = 0.5 - sin * 0.5;
    this._endX = 0.5 + cos * 0.5;
    this._endY = 0.5 + sin * 0.5;
    return this;
  }

  /**
   * Set gradient direction from point to point (0-1 coordinates)
   */
  direction(startX: number, startY: number, endX: number, endY: number): this {
    this._startX = startX;
    this._startY = startY;
    this._endX = endX;
    this._endY = endY;
    return this;
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): GradientPaint {
    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_LINEAR, name: "GRADIENT_LINEAR" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._startX, y: this._startY },
        { x: this._endX, y: this._endY },
      ],
    };
  }
}

// =============================================================================
// Radial Gradient Paint Builder
// =============================================================================

export class RadialGradientBuilder {
  private _stops: GradientStop[];
  private _centerX: number;
  private _centerY: number;
  private _radiusX: number;
  private _radiusY: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    this._stops = [
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 },
    ];
    this._centerX = 0.5;
    this._centerY = 0.5;
    this._radiusX = 0.5;
    this._radiusY = 0.5;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  stops(stops: GradientStop[]): this {
    this._stops = stops;
    return this;
  }

  addStop(r: number, g: number, b: number, position: number, a: number = 1): this {
    this._stops.push({ color: { r, g, b, a }, position });
    this._stops.sort((a, b) => a.position - b.position);
    return this;
  }

  /**
   * Set center position (0-1 coordinates)
   */
  center(x: number, y: number): this {
    this._centerX = x;
    this._centerY = y;
    return this;
  }

  /**
   * Set radius (0-1, relative to element size)
   */
  radius(r: number): this {
    this._radiusX = r;
    this._radiusY = r;
    return this;
  }

  /**
   * Set elliptical radius
   */
  ellipticalRadius(rx: number, ry: number): this {
    this._radiusX = rx;
    this._radiusY = ry;
    return this;
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): GradientPaint {
    // Figma uses 3 handle positions for radial gradients:
    // [0] = center, [1] = edge point 1, [2] = edge point 2 (for elliptical)
    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_RADIAL, name: "GRADIENT_RADIAL" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._centerX, y: this._centerY },
        { x: this._centerX + this._radiusX, y: this._centerY },
        { x: this._centerX, y: this._centerY + this._radiusY },
      ],
    };
  }
}

// =============================================================================
// Angular Gradient Paint Builder
// =============================================================================

export class AngularGradientBuilder {
  private _stops: GradientStop[];
  private _centerX: number;
  private _centerY: number;
  private _rotation: number; // degrees
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    this._stops = [
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 0, a: 1 }, position: 0.17 },
      { color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.33 },
      { color: { r: 0, g: 1, b: 1, a: 1 }, position: 0.5 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 0.67 },
      { color: { r: 1, g: 0, b: 1, a: 1 }, position: 0.83 },
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 1 },
    ];
    this._centerX = 0.5;
    this._centerY = 0.5;
    this._rotation = 0;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  stops(stops: GradientStop[]): this {
    this._stops = stops;
    return this;
  }

  addStop(r: number, g: number, b: number, position: number, a: number = 1): this {
    this._stops.push({ color: { r, g, b, a }, position });
    this._stops.sort((a, b) => a.position - b.position);
    return this;
  }

  center(x: number, y: number): this {
    this._centerX = x;
    this._centerY = y;
    return this;
  }

  /**
   * Set rotation in degrees
   */
  rotation(degrees: number): this {
    this._rotation = degrees;
    return this;
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): GradientPaint {
    const rad = (this._rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const radius = 0.5;

    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_ANGULAR, name: "GRADIENT_ANGULAR" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._centerX, y: this._centerY },
        { x: this._centerX + cos * radius, y: this._centerY + sin * radius },
        { x: this._centerX - sin * radius, y: this._centerY + cos * radius },
      ],
    };
  }
}

// =============================================================================
// Diamond Gradient Paint Builder
// =============================================================================

export class DiamondGradientBuilder {
  private _stops: GradientStop[];
  private _centerX: number;
  private _centerY: number;
  private _size: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    this._stops = [
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 },
    ];
    this._centerX = 0.5;
    this._centerY = 0.5;
    this._size = 0.5;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  stops(stops: GradientStop[]): this {
    this._stops = stops;
    return this;
  }

  addStop(r: number, g: number, b: number, position: number, a: number = 1): this {
    this._stops.push({ color: { r, g, b, a }, position });
    this._stops.sort((a, b) => a.position - b.position);
    return this;
  }

  center(x: number, y: number): this {
    this._centerX = x;
    this._centerY = y;
    return this;
  }

  size(s: number): this {
    this._size = s;
    return this;
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): GradientPaint {
    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_DIAMOND, name: "GRADIENT_DIAMOND" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._centerX, y: this._centerY },
        { x: this._centerX + this._size, y: this._centerY },
        { x: this._centerX, y: this._centerY + this._size },
      ],
    };
  }
}

// =============================================================================
// Image Paint Builder
// =============================================================================

export class ImagePaintBuilder {
  private _imageRef: string;
  private _scaleMode: ScaleMode;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;
  private _rotation: number;
  private _scalingFactor: number;
  private _filters: ImagePaint["filters"];

  constructor(imageRef: string) {
    this._imageRef = imageRef;
    this._scaleMode = "FILL";
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
    this._rotation = 0;
    this._scalingFactor = 1;
  }

  scaleMode(mode: ScaleMode): this {
    this._scaleMode = mode;
    return this;
  }

  rotation(degrees: number): this {
    this._rotation = degrees;
    return this;
  }

  scale(factor: number): this {
    this._scalingFactor = factor;
    return this;
  }

  /**
   * Set image filters
   */
  filters(filters: NonNullable<ImagePaint["filters"]>): this {
    this._filters = filters;
    return this;
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): ImagePaint {
    return {
      type: { value: PAINT_TYPE_VALUES.IMAGE, name: "IMAGE" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      imageRef: this._imageRef,
      scaleMode: { value: SCALE_MODE_VALUES[this._scaleMode], name: this._scaleMode },
      rotation: this._rotation !== 0 ? this._rotation : undefined,
      scalingFactor: this._scalingFactor !== 1 ? this._scalingFactor : undefined,
      filters: this._filters,
    };
  }
}

// =============================================================================
// Stroke Builder
// =============================================================================

const STROKE_CAP_VALUES: Record<StrokeCap, number> = {
  NONE: 0,
  ROUND: 1,
  SQUARE: 2,
  ARROW_LINES: 3,
  ARROW_EQUILATERAL: 4,
};

const STROKE_JOIN_VALUES: Record<StrokeJoin, number> = {
  MITER: 0,
  BEVEL: 1,
  ROUND: 2,
};

const STROKE_ALIGN_VALUES: Record<StrokeAlign, number> = {
  CENTER: 0,
  INSIDE: 1,
  OUTSIDE: 2,
};

export type StrokeData = {
  readonly paints: readonly Stroke[];
  readonly weight: number;
  readonly cap?: { value: number; name: StrokeCap };
  readonly join?: { value: number; name: StrokeJoin };
  readonly align?: { value: number; name: StrokeAlign };
  readonly dashPattern?: readonly number[];
  readonly miterLimit?: number;
};

export class StrokeBuilder {
  private _color: Color;
  private _weight: number;
  private _cap: StrokeCap;
  private _join: StrokeJoin;
  private _align: StrokeAlign;
  private _dashPattern?: number[];
  private _miterLimit: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor(r: number = 0, g: number = 0, b: number = 0, a: number = 1) {
    this._color = { r, g, b, a };
    this._weight = 1;
    this._cap = "NONE";
    this._join = "MITER";
    this._align = "CENTER";
    this._miterLimit = 4;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  color(r: number, g: number, b: number, a: number = 1): this {
    this._color = { r, g, b, a };
    return this;
  }

  weight(w: number): this {
    this._weight = w;
    return this;
  }

  cap(c: StrokeCap): this {
    this._cap = c;
    return this;
  }

  join(j: StrokeJoin): this {
    this._join = j;
    return this;
  }

  align(a: StrokeAlign): this {
    this._align = a;
    return this;
  }

  dash(pattern: number[]): this {
    this._dashPattern = pattern;
    return this;
  }

  miterLimit(limit: number): this {
    this._miterLimit = limit;
    return this;
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): StrokeData {
    const paint: Stroke = {
      type: { value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" },
      color: this._color,
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
    };

    return {
      paints: [paint],
      weight: this._weight,
      cap: { value: STROKE_CAP_VALUES[this._cap], name: this._cap },
      join: { value: STROKE_JOIN_VALUES[this._join], name: this._join },
      align: { value: STROKE_ALIGN_VALUES[this._align], name: this._align },
      dashPattern: this._dashPattern,
      miterLimit: this._miterLimit !== 4 ? this._miterLimit : undefined,
    };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a solid color paint
 */
export function solidPaint(r: number, g: number, b: number, a: number = 1): SolidPaintBuilder {
  return new SolidPaintBuilder(r, g, b, a);
}

/**
 * Create a solid color paint from hex string
 */
export function solidPaintHex(hex: string): SolidPaintBuilder {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return new SolidPaintBuilder(0, 0, 0);
  }
  return new SolidPaintBuilder(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  );
}

/**
 * Create a linear gradient paint
 */
export function linearGradient(): LinearGradientBuilder {
  return new LinearGradientBuilder();
}

/**
 * Create a radial gradient paint
 */
export function radialGradient(): RadialGradientBuilder {
  return new RadialGradientBuilder();
}

/**
 * Create an angular (conic) gradient paint
 */
export function angularGradient(): AngularGradientBuilder {
  return new AngularGradientBuilder();
}

/**
 * Create a diamond gradient paint
 */
export function diamondGradient(): DiamondGradientBuilder {
  return new DiamondGradientBuilder();
}

/**
 * Create an image paint
 */
export function imagePaint(imageRef: string): ImagePaintBuilder {
  return new ImagePaintBuilder(imageRef);
}

/**
 * Create a stroke
 */
export function stroke(r: number = 0, g: number = 0, b: number = 0, a: number = 1): StrokeBuilder {
  return new StrokeBuilder(r, g, b, a);
}
