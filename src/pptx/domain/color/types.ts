/**
 * @file Color and fill domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type {
  BlipCompression,
  Brand,
  Degrees,
  Percent,
  Pixels,
  RectAlignment,
  ResourceId,
  SchemeColorValue,
} from "../types";
import type { ResolvedBlipResource } from "../resource";

// =============================================================================
// Color Types
// =============================================================================

/**
 * Resolved color value (hex without #) - branded type
 * All color types are resolved to this during parsing
 *
 * @example
 * const color = "FF0000" as ResolvedColor; // Red
 */
export type ResolvedColor = Brand<string, 'ResolvedColor'>;

/**
 * Create a ResolvedColor from a hex string.
 */
export const color = (value: string): ResolvedColor => value as ResolvedColor;

/**
 * sRGB color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.32 (srgbClr)
 */
export type SrgbColor = {
  readonly type: "srgb";
  readonly value: string; // 6-digit hex (e.g., "FF0000")
};

/**
 * Scheme color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.29 (schemeClr)
 */
export type SchemeColor = {
  readonly type: "scheme";
  readonly value: SchemeColorValue;
};

/**
 * System color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.33 (sysClr)
 */
export type SystemColor = {
  readonly type: "system";
  readonly value: string; // e.g., "windowText", "window"
  readonly lastColor?: string; // Cached color value
};

/**
 * Preset color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.22 (prstClr)
 */
export type PresetColor = {
  readonly type: "preset";
  readonly value: string; // e.g., "red", "blue", "green"
};

/**
 * HSL color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.13 (hslClr)
 */
export type HslColor = {
  readonly type: "hsl";
  readonly hue: Degrees;
  readonly saturation: Percent;
  readonly luminance: Percent;
};

/**
 * scRGB color specification
 * Uses percentage values for each channel (-1000% to +1000% per ECMA-376)
 * @see ECMA-376 Part 1, Section 20.1.2.3.30 (scrgbClr)
 */
export type ScrgbColor = {
  readonly type: "scrgb";
  readonly red: Percent;
  readonly green: Percent;
  readonly blue: Percent;
};

/**
 * Color transform modifications
 * @see ECMA-376 Part 1, Section 20.1.2.3 (color transforms)
 */
export type ColorTransform = {
  readonly alpha?: Percent;
  readonly alphaMod?: Percent;
  readonly alphaOff?: Percent;
  readonly hue?: Degrees;
  readonly hueMod?: Percent;
  readonly hueOff?: Degrees;
  readonly sat?: Percent;
  readonly satMod?: Percent;
  readonly satOff?: Percent;
  readonly lum?: Percent;
  readonly lumMod?: Percent;
  readonly lumOff?: Percent;
  readonly gamma?: boolean;
  readonly invGamma?: boolean;
  readonly blueMod?: Percent;
  readonly blueOff?: Percent;
  readonly green?: Percent;
  readonly greenMod?: Percent;
  readonly greenOff?: Percent;
  readonly redMod?: Percent;
  readonly redOff?: Percent;
  readonly shade?: Percent;
  readonly tint?: Percent;
  readonly comp?: boolean; // Complement
  readonly inv?: boolean; // Inverse
  readonly gray?: boolean; // Grayscale
};

/**
 * Union of all color specifications
 */
export type ColorSpec =
  | SrgbColor
  | SchemeColor
  | SystemColor
  | PresetColor
  | HslColor
  | ScrgbColor;

/**
 * Color with optional transforms
 */
export type Color = {
  readonly spec: ColorSpec;
  readonly transform?: ColorTransform;
};

// =============================================================================
// Fill Types
// =============================================================================

/**
 * No fill
 * @see ECMA-376 Part 1, Section 20.1.8.44 (noFill)
 */
export type NoFill = {
  readonly type: "noFill";
};

/**
 * Solid fill
 * @see ECMA-376 Part 1, Section 20.1.8.54 (solidFill)
 */
export type SolidFill = {
  readonly type: "solidFill";
  readonly color: Color;
};

/**
 * Gradient stop
 * @see ECMA-376 Part 1, Section 20.1.8.36 (gs)
 */
export type GradientStop = {
  readonly position: Percent;
  readonly color: Color;
};

/**
 * Linear gradient properties
 * @see ECMA-376 Part 1, Section 20.1.8.41 (lin)
 */
export type LinearGradient = {
  readonly angle: Degrees;
  readonly scaled: boolean;
};

/**
 * Path gradient properties
 * @see ECMA-376 Part 1, Section 20.1.8.46 (path)
 */
export type PathGradient = {
  readonly path: "circle" | "rect" | "shape";
  readonly fillToRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
};

/**
 * Gradient fill
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */
export type GradientFill = {
  readonly type: "gradientFill";
  readonly stops: readonly GradientStop[];
  readonly linear?: LinearGradient;
  readonly path?: PathGradient;
  readonly tileRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
  readonly rotWithShape: boolean;
};

/**
 * Tile mode for picture fills
 * @see ECMA-376 Part 1, Section 20.1.10.66 (ST_TileFlipMode)
 */
export type TileFlipMode = "none" | "x" | "y" | "xy";

/**
 * Stretch fill mode
 * @see ECMA-376 Part 1, Section 20.1.8.56 (stretch)
 */
export type StretchFill = {
  readonly fillRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
};

/**
 * Tile fill mode
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */
export type TileFill = {
  readonly tx: Pixels;
  readonly ty: Pixels;
  readonly sx: Percent;
  readonly sy: Percent;
  readonly flip: TileFlipMode;
  readonly alignment: RectAlignment;
};

/**
 * Blip effects (color transform effects applied to the blip image)
 * These are child elements of a:blip that modify the image appearance.
 * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
 */
export type BlipEffects = {
  readonly alphaBiLevel?: { readonly threshold: Percent };
  readonly alphaCeiling?: boolean;
  readonly alphaFloor?: boolean;
  readonly alphaInv?: boolean;
  readonly alphaMod?: boolean;
  readonly alphaModFix?: { readonly amount: Percent };
  readonly alphaRepl?: { readonly alpha: Percent };
  readonly biLevel?: { readonly threshold: Percent };
  readonly blur?: { readonly radius: Pixels; readonly grow: boolean };
  readonly colorChange?: { readonly from: Color; readonly to: Color; readonly useAlpha: boolean };
  readonly colorReplace?: { readonly color: Color };
  readonly duotone?: { readonly colors: readonly [Color, Color] };
  readonly grayscale?: boolean;
  readonly hsl?: { readonly hue: Degrees; readonly saturation: Percent; readonly luminance: Percent };
  readonly luminance?: { readonly brightness: Percent; readonly contrast: Percent };
  readonly tint?: { readonly hue: Degrees; readonly amount: Percent };
};

/**
 * Picture/Blip fill
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type BlipFill = {
  readonly type: "blipFill";
  /**
   * Resource ID (relationship ID, e.g., "rId2") or pre-resolved data URL.
   * When resolved at parse time, resolvedResource will also be populated.
   */
  readonly resourceId: ResourceId;
  /**
   * Whether the underlying relationship was referenced via r:embed or r:link.
   *
   * Note: When resourceId is a data URL, this value is not semantically meaningful
   * for OOXML export and is typically set to "embed".
   */
  readonly relationshipType: "embed" | "link";
  /**
   * Resolved image resource data (when resolved at parse time).
   * This allows the render layer to convert to the appropriate format
   * (Data URL, Blob URL, etc.) without needing to access the zip file.
   */
  readonly resolvedResource?: ResolvedBlipResource;
  readonly compressionState?: BlipCompression;
  /**
   * DPI for rendering the blip.
   * @see ECMA-376 Part 1, Section 20.1.8.14 (dpi attribute)
   */
  readonly dpi?: number;
  /**
   * Effects applied to the blip image (color transforms).
   * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
   */
  readonly blipEffects?: BlipEffects;
  readonly stretch?: StretchFill;
  readonly tile?: TileFill;
  readonly sourceRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
  readonly rotWithShape: boolean;
};

/**
 * Pattern preset values
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export const PATTERN_PRESETS = [
  "pct5", "pct10", "pct20", "pct25", "pct30", "pct40", "pct50",
  "pct60", "pct70", "pct75", "pct80", "pct90",
  "horz", "vert", "ltHorz", "ltVert", "dkHorz", "dkVert",
  "narHorz", "narVert", "dashHorz", "dashVert", "cross",
  "dnDiag", "upDiag", "ltDnDiag", "ltUpDiag", "dkDnDiag", "dkUpDiag",
  "wdDnDiag", "wdUpDiag", "dashDnDiag", "dashUpDiag", "diagCross",
  "smCheck", "lgCheck", "smGrid", "lgGrid", "dotGrid",
  "smConfetti", "lgConfetti", "horzBrick", "diagBrick",
  "solidDmnd", "openDmnd", "dotDmnd", "plaid", "sphere",
  "weave", "divot", "shingle", "wave", "trellis", "zigZag",
] as const;

/**
 * Pattern fill type
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export type PatternType = typeof PATTERN_PRESETS[number];

/**
 * Pattern fill
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */
export type PatternFill = {
  readonly type: "patternFill";
  readonly preset: PatternType;
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
};

/**
 * Group fill (inherit from group)
 * @see ECMA-376 Part 1, Section 20.1.8.35 (grpFill)
 */
export type GroupFill = {
  readonly type: "groupFill";
};

/**
 * Union of all fill types
 */
export type Fill =
  | NoFill
  | SolidFill
  | GradientFill
  | BlipFill
  | PatternFill
  | GroupFill;

// =============================================================================
// Line (Stroke) Types
// =============================================================================

/**
 * Line end specification
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd/tailEnd)
 */
export type LineEnd = {
  readonly type: "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";
  readonly width: "sm" | "med" | "lg";
  readonly length: "sm" | "med" | "lg";
};

/**
 * Custom dash specification
 * @see ECMA-376 Part 1, Section 20.1.8.21 (custDash)
 */
export type CustomDash = {
  readonly dashes: readonly {
    readonly dashLength: Percent;
    readonly spaceLength: Percent;
  }[];
};

/**
 * Line properties
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */
export type Line = {
  readonly width: Pixels;
  readonly cap: "flat" | "round" | "square";
  readonly compound: "sng" | "dbl" | "thickThin" | "thinThick" | "tri";
  readonly alignment: "ctr" | "in";
  readonly fill: Fill;
  readonly dash: string | CustomDash; // Preset name or custom
  readonly headEnd?: LineEnd;
  readonly tailEnd?: LineEnd;
  readonly join: "bevel" | "miter" | "round";
  readonly miterLimit?: number;
};

// =============================================================================
// Color Mapping Types
// =============================================================================

/**
 * Color mapping scheme
 * @see ECMA-376 Part 1, Section 20.1.6.3 (clrMap)
 */
export type ColorMapping = {
  readonly bg1?: string;
  readonly tx1?: string;
  readonly bg2?: string;
  readonly tx2?: string;
  readonly accent1?: string;
  readonly accent2?: string;
  readonly accent3?: string;
  readonly accent4?: string;
  readonly accent5?: string;
  readonly accent6?: string;
  readonly hlink?: string;
  readonly folHlink?: string;
};

/**
 * Color map override
 * @see ECMA-376 Part 1, Section 19.3.1.6 (clrMapOvr)
 */
export type ColorMapOverride =
  | { readonly type: "none" }
  | { readonly type: "override"; readonly mappings: ColorMapping };
