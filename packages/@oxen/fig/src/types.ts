/**
 * @file Fig format types
 */

// =============================================================================
// File Header Types
// =============================================================================

/** .fig file header structure */
export type FigHeader = {
  /** Magic header "fig-kiwi" */
  readonly magic: "fig-kiwi";
  /** Version character (typically '0') */
  readonly version: string;
  /** Payload size in bytes */
  readonly payloadSize: number;
};

/** Header size in bytes (8 magic + 1 version + 3 reserved + 4 size = 16) */
export const FIG_HEADER_SIZE = 16;

/** Magic header string */
export const FIG_MAGIC = "fig-kiwi";

// =============================================================================
// Compression Types
// =============================================================================

/** Compression type used in payload */
export type CompressionType = "deflate" | "zstd" | "none";

/** Zstandard magic bytes */
export const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]);

// =============================================================================
// Kiwi Schema Types
// =============================================================================

/** Kiwi primitive types */
export type KiwiPrimitiveType =
  | "bool"
  | "byte"
  | "int"
  | "uint"
  | "float"
  | "string"
  | "int64"
  | "uint64";

/** Kiwi definition kinds */
export type KiwiDefinitionKind = "ENUM" | "STRUCT" | "MESSAGE";

/** Kiwi field definition */
export type KiwiField = {
  readonly name: string;
  readonly type: KiwiPrimitiveType | string;
  readonly typeId: number;
  readonly isArray: boolean;
  readonly value: number;
};

/** Kiwi definition (enum, struct, or message) */
export type KiwiDefinition = {
  readonly name: string;
  readonly kind: KiwiDefinitionKind;
  readonly fields: readonly KiwiField[];
};

/** Kiwi schema */
export type KiwiSchema = {
  readonly definitions: readonly KiwiDefinition[];
};

// =============================================================================
// Parsed Fig File Types
// =============================================================================

/** Parsed resource (image, etc.) */
export type FigResource = {
  readonly id: string;
  readonly type: "image" | "video" | "font" | "unknown";
  readonly data: Uint8Array;
  readonly mimeType?: string;
};

/** Parsed fig file data */
export type FigFile = {
  readonly header: FigHeader;
  readonly schema: KiwiSchema;
  readonly document: FigDocument;
  readonly resources: readonly FigResource[];
};

/** Fig document tree */
export type FigDocument = {
  readonly type: string;
  readonly children?: readonly FigNode[];
  readonly [key: string]: unknown;
};

/** Fig node (generic) */
export type FigNode = {
  readonly type: string;
  readonly id?: string;
  readonly name?: string;
  readonly children?: readonly FigNode[];
  readonly [key: string]: unknown;
};

// =============================================================================
// Builder Types
// =============================================================================

/** Options for building a .fig file */
export type FigBuildOptions = {
  /** Compression type to use (default: "deflate") */
  compression?: CompressionType;
  /** Compression level (0-9, default: 6) */
  compressionLevel?: number;
};

/** Input for building a .fig file */
export type FigBuildInput = {
  readonly schema: KiwiSchema;
  readonly document: FigDocument;
  readonly resources?: readonly FigResource[];
};

// =============================================================================
// Figma Node Types
// =============================================================================

/**
 * Known Figma node types
 */
export type FigNodeType =
  | "DOCUMENT"
  | "CANVAS"
  | "FRAME"
  | "GROUP"
  | "RECTANGLE"
  | "ELLIPSE"
  | "VECTOR"
  | "TEXT"
  | "LINE"
  | "BOOLEAN_OPERATION"
  | "COMPONENT"
  | "COMPONENT_SET"
  | "INSTANCE"
  | "STAR"
  | "REGULAR_POLYGON"
  | "SLICE"
  | "STICKY"
  | "CONNECTOR"
  | "SHAPE_WITH_TEXT"
  | "CODE_BLOCK"
  | "STAMP"
  | "WIDGET"
  | "EMBED"
  | "LINK_UNFURL"
  | "MEDIA"
  | "SECTION"
  | "TABLE"
  | "TABLE_CELL";

// =============================================================================
// Figma Geometry Types
// =============================================================================

/**
 * Figma 2x3 affine transform matrix
 * Represents a 2D transformation: [a c tx; b d ty]
 */
export type FigMatrix = {
  readonly m00: number; // a (scale x)
  readonly m01: number; // c (skew x)
  readonly m02: number; // tx (translate x)
  readonly m10: number; // b (skew y)
  readonly m11: number; // d (scale y)
  readonly m12: number; // ty (translate y)
};

/**
 * 2D vector
 */
export type FigVector = {
  readonly x: number;
  readonly y: number;
};

// =============================================================================
// Figma Color Types
// =============================================================================

/**
 * RGBA color (0-1 range)
 */
export type FigColor = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
};

// =============================================================================
// Figma Paint Types
// =============================================================================

/**
 * Paint type enum
 */
export type FigPaintType =
  | "SOLID"
  | "GRADIENT_LINEAR"
  | "GRADIENT_RADIAL"
  | "GRADIENT_ANGULAR"
  | "GRADIENT_DIAMOND"
  | "IMAGE"
  | "EMOJI"
  | "VIDEO";

/**
 * Gradient stop
 */
export type FigGradientStop = {
  readonly position: number;
  readonly color: FigColor;
};

/**
 * Base paint interface
 */
export type FigPaintBase = {
  readonly type: FigPaintType;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: string;
};

/**
 * Solid paint
 */
export type FigSolidPaint = FigPaintBase & {
  readonly type: "SOLID";
  readonly color: FigColor;
};

/**
 * Gradient paint
 */
export type FigGradientPaint = FigPaintBase & {
  readonly type:
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND";
  readonly gradientHandlePositions: readonly FigVector[];
  readonly gradientStops: readonly FigGradientStop[];
};

/**
 * Image paint
 */
export type FigImagePaint = FigPaintBase & {
  readonly type: "IMAGE";
  readonly scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  readonly imageRef?: string;
};

/**
 * Union of all paint types
 */
export type FigPaint =
  | FigSolidPaint
  | FigGradientPaint
  | FigImagePaint
  | FigPaintBase;

// =============================================================================
// Figma Stroke Types
// =============================================================================

/**
 * Stroke weight type
 */
export type FigStrokeWeight =
  | number
  | {
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
      readonly left: number;
    };

/**
 * Stroke cap type
 */
export type FigStrokeCap =
  | "NONE"
  | "ROUND"
  | "SQUARE"
  | "LINE_ARROW"
  | "TRIANGLE_ARROW";

/**
 * Stroke join type
 */
export type FigStrokeJoin = "MITER" | "BEVEL" | "ROUND";

/**
 * Stroke align type
 */
export type FigStrokeAlign = "INSIDE" | "OUTSIDE" | "CENTER";
