/**
 * @file Common domain types for PPTX processing
 *
 * These types represent ECMA-376 concepts in a renderer-agnostic way.
 * All measurements are converted to CSS-friendly units (px, degrees).
 *
 * Uses branded types for type safety - prevents mixing Pixels with Degrees, etc.
 *
 * @see ECMA-376 Part 1, DrawingML
 */

import type { Color } from "./color";

// =============================================================================
// Branded Type Utilities
// =============================================================================

/**
 * Brand a primitive type to create a nominal type.
 * This prevents accidental mixing of semantically different values.
 *
 * @example
 * type Pixels = Brand<number, 'Pixels'>;
 * type Degrees = Brand<number, 'Degrees'>;
 * const px: Pixels = 100 as Pixels;
 * const deg: Degrees = 45 as Degrees;
 * // px = deg; // Error: Type 'Degrees' is not assignable to type 'Pixels'
 */
declare const __brand: unique symbol;

/**
 * Brand a primitive type to create a nominal type.
 * Exported for use in other domain type definitions.
 */
export type Brand<K, T> = K & { readonly [__brand]: T };

// =============================================================================
// Measurement Types (Branded)
// =============================================================================

/**
 * Length in pixels (branded)
 * Original EMU values are converted during parsing
 *
 * @example
 * const width = parseEmu("914400") as Pixels; // 1 inch = 96px
 */
export type Pixels = Brand<number, 'Pixels'>;

/**
 * Angle in degrees 0-360 (branded)
 * Original 60000ths values are converted during parsing
 *
 * @example
 * const rotation = parseAngle("5400000") as Degrees; // 90 degrees
 */
export type Degrees = Brand<number, 'Degrees'>;

/**
 * Percentage 0-100 (branded)
 * Original 1000ths or 100000ths values are converted during parsing
 *
 * @example
 * const opacity = parsePercentage100k("50000") as Percent; // 50%
 */
export type Percent = Brand<number, 'Percent'>;

/**
 * Points for font sizes (branded)
 * Original 100ths values are converted during parsing
 *
 * @example
 * const fontSize = parseFontSize("1800") as Points; // 18pt
 */
export type Points = Brand<number, 'Points'>;

// =============================================================================
// Branded Type Constructors
// =============================================================================

/**
 * Create a Pixels value from a number.
 * Use this instead of `as Pixels` for runtime conversion.
 */
export const px = (value: number): Pixels => value as Pixels;

/**
 * Create a Degrees value from a number.
 */
export const deg = (value: number): Degrees => value as Degrees;

/**
 * Create a Percent value from a number.
 */
export const pct = (value: number): Percent => value as Percent;

/**
 * Create a Points value from a number.
 */
export const pt = (value: number): Points => value as Points;

// =============================================================================
// Geometry Types
// =============================================================================

/**
 * 2D point
 */
export type Point = {
  readonly x: Pixels;
  readonly y: Pixels;
};

/**
 * 2D size
 */
export type Size = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Bounding box (position + size)
 */
export type Bounds = Point & Size;

/**
 * Effect extent (object extents including effects)
 * @see ECMA-376 Part 1, Section 20.4.2.6 (effectExtent)
 */
export type EffectExtent = {
  readonly left: Pixels;
  readonly top: Pixels;
  readonly right: Pixels;
  readonly bottom: Pixels;
};

/**
 * Transform properties for shapes
 * @see ECMA-376 Part 1, Section 20.1.7.6 (xfrm)
 */
export type Transform = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly rotation: Degrees;
  readonly flipH: boolean;
  readonly flipV: boolean;
};

/**
 * Group transform for nested positioning
 * @see ECMA-376 Part 1, Section 20.1.7.5 (chOff, chExt)
 */
export type GroupTransform = Transform & {
  readonly childOffsetX: Pixels;
  readonly childOffsetY: Pixels;
  readonly childExtentWidth: Pixels;
  readonly childExtentHeight: Pixels;
};

// =============================================================================
// Text Alignment Types
// =============================================================================

/**
 * Horizontal text alignment
 * @see ECMA-376 Part 1, Section 21.1.2.1.25 (ST_TextAlignType)
 */
export type TextAlign = "left" | "center" | "right" | "justify" | "justifyLow" | "distributed" | "thaiDistributed";

/**
 * Vertical text anchor
 * @see ECMA-376 Part 1, Section 21.1.2.1.3 (ST_TextAnchoringType)
 */
export type TextAnchor = "top" | "center" | "bottom";

/**
 * Font style (normal/italic)
 */
export type FontStyle = "normal" | "italic";

/**
 * Text capitalization
 * @see ECMA-376 Part 1, Section 21.1.2.1.6 (ST_TextCapsType)
 */
export type TextCaps = "none" | "small" | "all";

/**
 * Vertical text alignment (superscript/subscript)
 * @see ECMA-376 Part 1, Section 21.1.2.3.3 (baseline attribute)
 */
export type VerticalAlign = "baseline" | "superscript" | "subscript";

/**
 * Text direction
 */
export type TextDirection = "ltr" | "rtl";

/**
 * Text typeface
 * @see ECMA-376 Part 1, Section 20.1.10.81 (ST_TextTypeface)
 */
export type TextTypeface = string;

/**
 * Relative horizontal alignment positions
 * @see ECMA-376 Part 1, Section 20.4.3.1 (ST_AlignH)
 */
export type AlignH = "left" | "right" | "center" | "inside" | "outside";

/**
 * Vertical alignment definition
 * @see ECMA-376 Part 1, Section 20.4.3.2 (ST_AlignV)
 */
export type AlignV = "top" | "bottom" | "center" | "inside" | "outside";

/**
 * Horizontal relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.4 (ST_RelFromH)
 */
export type RelFromH =
  | "character"
  | "column"
  | "insideMargin"
  | "leftMargin"
  | "margin"
  | "outsideMargin"
  | "page"
  | "rightMargin";

/**
 * Horizontal positioning for floating objects
 * @see ECMA-376 Part 1, Section 20.4.2.10 (positionH)
 */
export type PositionH = {
  readonly relativeFrom: RelFromH;
  readonly align?: AlignH;
  readonly offset?: Pixels;
};

/**
 * Vertical relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.5 (ST_RelFromV)
 */
export type RelFromV =
  | "bottomMargin"
  | "insideMargin"
  | "line"
  | "margin"
  | "outsideMargin"
  | "page"
  | "paragraph"
  | "topMargin";

/**
 * Vertical positioning for floating objects
 * @see ECMA-376 Part 1, Section 20.4.2.11 (positionV)
 */
export type PositionV = {
  readonly relativeFrom: RelFromV;
  readonly align?: AlignV;
  readonly offset?: Pixels;
};

/**
 * Wrapping polygon definition
 * @see ECMA-376 Part 1, Section 20.4.2.16 (wrapPolygon)
 */
export type WrapPolygon = {
  readonly edited?: boolean;
  readonly start: Point;
  readonly lineTo: readonly Point[];
};

/**
 * Text wrapping location for floating objects
 * @see ECMA-376 Part 1, Section 20.4.3.7 (ST_WrapText)
 */
export type WrapText = "bothSides" | "left" | "right" | "largest";

/**
 * Wrap distance from text (EMUs -> pixels)
 * @see ECMA-376 Part 1, Section 20.4.3.6 (ST_WrapDistance)
 */
export type WrapDistance = Pixels;

/**
 * Square wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.17 (wrapSquare)
 */
export type WrapSquare = {
  readonly wrapText: WrapText;
  readonly distTop?: WrapDistance;
  readonly distBottom?: WrapDistance;
  readonly distLeft?: WrapDistance;
  readonly distRight?: WrapDistance;
  readonly effectExtent?: EffectExtent;
};

/**
 * Through wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.18 (wrapThrough)
 */
export type WrapThrough = {
  readonly wrapText: WrapText;
  readonly distLeft?: WrapDistance;
  readonly distRight?: WrapDistance;
  readonly polygon: WrapPolygon;
};

/**
 * Tight wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.19 (wrapTight)
 */
export type WrapTight = {
  readonly wrapText: WrapText;
  readonly distLeft?: WrapDistance;
  readonly distRight?: WrapDistance;
  readonly polygon: WrapPolygon;
};

/**
 * Top and bottom wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.20 (wrapTopAndBottom)
 */
export type WrapTopAndBottom = {
  readonly distTop?: WrapDistance;
  readonly distBottom?: WrapDistance;
};

/**
 * Group shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.21 (CT_GroupLocking)
 */
export type GroupLocks = {
  readonly noGrp?: boolean;
  readonly noUngrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
};

/**
 * Connector shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.11 (CT_ConnectorLocking)
 */
export type ConnectorLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
};

/**
 * Picture shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.31 (CT_PictureLocking)
 */
export type PictureLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
  readonly noCrop?: boolean;
};

/**
 * Shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.34 (CT_ShapeLocking)
 */
export type ShapeLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
  readonly noTextEdit?: boolean;
};

/**
 * Content part locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.43 (CT_ContentPartLocking)
 */
export type ContentPartLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
};

/**
 * Content part reference (WordprocessingML)
 * @see ECMA-376 Part 1, Section 20.4.2.29 (contentPart)
 */
export type ContentPart = {
  readonly id: ResourceId;
  readonly bwMode?: BlackWhiteMode;
};

/**
 * Linked textbox information
 * @see ECMA-376 Part 1, Section 20.4.2.34 (linkedTxbx)
 */
export type LinkedTextbox = {
  readonly id: number;
  readonly seq: number;
};

/**
 * Textbox story info (first in sequence)
 * @see ECMA-376 Part 1, Section 20.4.2.37 (txbx)
 */
export type TextboxInfo = {
  readonly id: number;
};

/**
 * Absolute anchor for spreadsheet drawings
 * @see ECMA-376 Part 1, Section 20.5.2.1 (absoluteAnchor)
 */
export type AbsoluteAnchor = {
  readonly position: Point;
  readonly size: Size;
};

/**
 * Spreadsheet drawing client data
 * @see ECMA-376 Part 1, Section 20.5.2.3 (clientData)
 */
export type AnchorClientData = {
  readonly locksWithSheet?: boolean;
  readonly printsWithSheet?: boolean;
};

/**
 * Spreadsheet drawing marker
 * @see ECMA-376 Part 1, Section 20.5.2.15 (from)
 */
export type AnchorMarker = {
  readonly col: number;
  readonly row: number;
  readonly colOff?: Pixels;
  readonly rowOff?: Pixels;
};

/**
 * One cell anchor
 * @see ECMA-376 Part 1, Section 20.5.2.24 (oneCellAnchor)
 */
export type OneCellAnchor = {
  readonly from: AnchorMarker;
  readonly size: Size;
  readonly clientData?: AnchorClientData;
};

/**
 * Two cell anchor
 * @see ECMA-376 Part 1, Section 20.5.2.33 (twoCellAnchor)
 */
export type TwoCellAnchor = {
  readonly from: AnchorMarker;
  readonly to: AnchorMarker;
  readonly clientData?: AnchorClientData;
};

/**
 * Spreadsheet anchor resize behavior
 * @see ECMA-376 Part 1, Section 20.5.3.2 (ST_EditAs)
 */
export type EditAs = "twoCell" | "oneCell" | "absolute";

// =============================================================================
// Line Properties Types
// =============================================================================

/**
 * Line end type (arrow styles)
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_LineEndType)
 */
export type LineEndType = "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";

/**
 * Line end size
 * @see ECMA-376 Part 1, Section 20.1.10.56 (ST_LineEndWidth/Length)
 */
export type LineEndSize = "sm" | "med" | "lg";

/**
 * Line cap style
 * @see ECMA-376 Part 1, Section 20.1.10.31 (ST_LineCap)
 */
export type LineCap = "flat" | "round" | "square";

/**
 * Line join style
 * @see ECMA-376 Part 1, Section 20.1.10.32 (ST_LineJoin)
 */
export type LineJoin = "bevel" | "miter" | "round";

/**
 * Compound line type
 * @see ECMA-376 Part 1, Section 20.1.10.33 (ST_CompoundLine)
 */
export type CompoundLine = "sng" | "dbl" | "thickThin" | "thinThick" | "tri";

/**
 * Preset dash style
 * @see ECMA-376 Part 1, Section 20.1.10.48 (ST_PresetLineDashVal)
 */
export type DashStyle =
  | "solid"
  | "dot"
  | "dash"
  | "lgDash"
  | "dashDot"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDot"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot";

// =============================================================================
// Shape Geometry Types
// =============================================================================

/**
 * Preset shape type
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_ShapeType)
 */
export type PresetShapeType = string; // "rect", "ellipse", "roundRect", etc.

/**
 * Shape adjustment value (guide value for parametric shapes)
 */
export type AdjustValue = {
  readonly name: string;
  readonly value: number;
};

// =============================================================================
// Effect Types
// =============================================================================

/**
 * Shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
export type ShadowEffect = {
  readonly type: "outer" | "inner";
  readonly color: Color;
  readonly blurRadius: Pixels;
  readonly distance: Pixels;
  readonly direction: Degrees;
  readonly alignment?: string;
};

/**
 * Glow effect
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
export type GlowEffect = {
  readonly color: Color;
  readonly radius: Pixels;
};

/**
 * Reflection effect
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
export type ReflectionEffect = {
  readonly blurRadius: Pixels;
  readonly startOpacity: Percent;
  readonly endOpacity: Percent;
  readonly distance: Pixels;
  readonly direction: Degrees;
  readonly fadeDirection: Degrees;
  readonly scaleX: Percent;
  readonly scaleY: Percent;
};

/**
 * Soft edge effect
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
export type SoftEdgeEffect = {
  readonly radius: Pixels;
};

/**
 * Alpha bi-level effect
 * @see ECMA-376 Part 1, Section 20.1.8.1 (alphaBiLevel)
 */
export type AlphaBiLevelEffect = {
  readonly threshold: Percent;
};

/**
 * Alpha ceiling effect
 * @see ECMA-376 Part 1, Section 20.1.8.2 (alphaCeiling)
 */
export type AlphaCeilingEffect = {
  readonly type: "alphaCeiling";
};

/**
 * Alpha floor effect
 * @see ECMA-376 Part 1, Section 20.1.8.3 (alphaFloor)
 */
export type AlphaFloorEffect = {
  readonly type: "alphaFloor";
};

/**
 * Alpha inverse effect
 * @see ECMA-376 Part 1, Section 20.1.8.4 (alphaInv)
 */
export type AlphaInverseEffect = {
  readonly type: "alphaInv";
};

/**
 * Alpha modulate effect
 * @see ECMA-376 Part 1, Section 20.1.8.5 (alphaMod)
 */
export type AlphaModulateEffect = {
  readonly type: "alphaMod";
  readonly containerType?: "sib" | "tree";
  readonly name?: string;
  readonly container?: EffectContainer;
};

/**
 * Alpha modulate fixed effect
 * @see ECMA-376 Part 1, Section 20.1.8.6 (alphaModFix)
 */
export type AlphaModulateFixedEffect = {
  readonly amount: Percent;
};

/**
 * Alpha outset/inset effect
 * @see ECMA-376 Part 1, Section 20.1.8.7 (alphaOutset)
 */
export type AlphaOutsetEffect = {
  readonly radius: Pixels;
};

/**
 * Alpha replace effect
 * @see ECMA-376 Part 1, Section 20.1.8.8 (alphaRepl)
 */
export type AlphaReplaceEffect = {
  readonly alpha: Percent;
};

/**
 * Bi-level (black/white) effect
 * @see ECMA-376 Part 1, Section 20.1.8.11 (biLevel)
 */
export type BiLevelEffect = {
  readonly threshold: Percent;
};

/**
 * Blend mode values
 * @see ECMA-376 Part 1, Section 20.1.10.11 (ST_BlendMode)
 */
export type BlendMode = "over" | "mult" | "screen" | "darken" | "lighten";

/**
 * Effect container relationship type
 * @see ECMA-376 Part 1, Section 20.1.10.22 (ST_EffectContainerType)
 */
export type EffectContainerType = "sib" | "tree";

/**
 * Black and white rendering mode values
 * @see ECMA-376 Part 1, Section 20.1.10.10 (ST_BlackWhiteMode)
 */
export type BlackWhiteMode =
  | "auto"
  | "black"
  | "blackGray"
  | "blackWhite"
  | "clr"
  | "gray"
  | "grayWhite"
  | "hidden"
  | "invGray"
  | "ltGray"
  | "white";

/**
 * Blip compression type
 * @see ECMA-376 Part 1, Section 20.1.10.12 (ST_BlipCompression)
 */
export type BlipCompression =
  | "email"
  | "hqprint"
  | "none"
  | "print"
  | "screen";

/**
 * Theme color scheme index
 * @see ECMA-376 Part 1, Section 20.1.10.14 (ST_ColorSchemeIndex)
 */
export type ColorSchemeIndex =
  | "dk1"
  | "lt1"
  | "dk2"
  | "lt2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hlink"
  | "folHlink";

/**
 * Scheme color value
 * @see ECMA-376 Part 1, Section 20.1.10.54 (ST_SchemeColorVal)
 */
export type SchemeColorValue =
  | "dk1"
  | "lt1"
  | "dk2"
  | "lt2"
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "accent5"
  | "accent6"
  | "hlink"
  | "folHlink"
  | "bg1"
  | "bg2"
  | "tx1"
  | "tx2"
  | "phClr";

/**
 * Shape ID (token)
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_ShapeID)
 */
export type ShapeId = string;

/**
 * Style matrix column index (unsigned int)
 * @see ECMA-376 Part 1, Section 20.1.10.57 (ST_StyleMatrixColumnIndex)
 */
export type StyleMatrixColumnIndex = number;

/**
 * Preset text shape type
 * @see ECMA-376 Part 1, Section 20.1.10.76 (ST_TextShapeType)
 */
export type TextShapeType =
  | "textNoShape"
  | "textPlain"
  | "textStop"
  | "textTriangle"
  | "textTriangleInverted"
  | "textChevron"
  | "textChevronInverted"
  | "textRingInside"
  | "textRingOutside"
  | "textArchUp"
  | "textArchDown"
  | "textCircle"
  | "textButton"
  | "textArchUpPour"
  | "textArchDownPour"
  | "textCirclePour"
  | "textButtonPour"
  | "textCurveUp"
  | "textCurveDown"
  | "textCanUp"
  | "textCanDown"
  | "textWave1"
  | "textWave2"
  | "textDoubleWave1"
  | "textWave4"
  | "textInflate"
  | "textDeflate"
  | "textInflateBottom"
  | "textDeflateBottom"
  | "textInflateTop"
  | "textDeflateTop"
  | "textDeflateInflate"
  | "textDeflateInflateDeflate"
  | "textFadeRight"
  | "textFadeLeft"
  | "textFadeUp"
  | "textFadeDown"
  | "textSlantUp"
  | "textSlantDown"
  | "textCascadeUp"
  | "textCascadeDown";

/**
 * Font collection index
 * @see ECMA-376 Part 1, Section 20.1.10.25 (ST_FontCollectionIndex)
 */
export type FontCollectionIndex = "major" | "minor" | "none";

/**
 * Light rig direction
 * @see ECMA-376 Part 1, Section 20.1.10.29 (ST_LightRigDirection)
 */
export type LightRigDirection =
  | "b"
  | "bl"
  | "br"
  | "l"
  | "r"
  | "t"
  | "tl"
  | "tr";

/**
 * Light rig preset type
 * @see ECMA-376 Part 1, Section 20.1.10.30 (ST_LightRigType)
 */
export type LightRigType =
  | "balanced"
  | "brightRoom"
  | "chilly"
  | "contrasting"
  | "flat"
  | "flood"
  | "freezing"
  | "glow"
  | "harsh"
  | "legacyFlat1"
  | "legacyFlat2"
  | "legacyFlat3"
  | "legacyFlat4"
  | "legacyHarsh1"
  | "legacyHarsh2"
  | "legacyHarsh3"
  | "legacyHarsh4"
  | "legacyNormal1"
  | "legacyNormal2"
  | "legacyNormal3"
  | "legacyNormal4"
  | "morning"
  | "soft"
  | "sunrise"
  | "sunset"
  | "threePt"
  | "twoPt";

/**
 * On/off style value
 * @see ECMA-376 Part 1, Section 20.1.10.36 (ST_OnOffStyleType)
 */
export type OnOffStyleType = "on" | "off" | "def";

/**
 * Camera preset type
 * @see ECMA-376 Part 1, Section 20.1.10.47 (ST_PresetCameraType)
 */
export type PresetCameraType =
  | "isometricBottomDown"
  | "isometricBottomUp"
  | "isometricLeftDown"
  | "isometricLeftUp"
  | "isometricOffAxis1Left"
  | "isometricOffAxis1Right"
  | "isometricOffAxis1Top"
  | "isometricOffAxis2Left"
  | "isometricOffAxis2Right"
  | "isometricOffAxis2Top"
  | "isometricOffAxis3Bottom"
  | "isometricOffAxis3Left"
  | "isometricOffAxis3Right"
  | "isometricOffAxis4Bottom"
  | "isometricOffAxis4Left"
  | "isometricOffAxis4Right"
  | "isometricRightDown"
  | "isometricRightUp"
  | "isometricTopDown"
  | "isometricTopUp"
  | "legacyObliqueBottom"
  | "legacyObliqueBottomLeft"
  | "legacyObliqueBottomRight"
  | "legacyObliqueFront"
  | "legacyObliqueLeft"
  | "legacyObliqueRight"
  | "legacyObliqueTop"
  | "legacyObliqueTopLeft"
  | "legacyObliqueTopRight"
  | "legacyPerspectiveBottom"
  | "legacyPerspectiveBottomLeft"
  | "legacyPerspectiveBottomRight"
  | "legacyPerspectiveFront"
  | "legacyPerspectiveLeft"
  | "legacyPerspectiveRight"
  | "legacyPerspectiveTop"
  | "legacyPerspectiveTopLeft"
  | "legacyPerspectiveTopRight"
  | "obliqueBottom"
  | "obliqueBottomLeft"
  | "obliqueBottomRight"
  | "obliqueLeft"
  | "obliqueRight"
  | "obliqueTop"
  | "obliqueTopLeft"
  | "obliqueTopRight"
  | "orthographicFront"
  | "perspectiveAbove"
  | "perspectiveAboveLeftFacing"
  | "perspectiveAboveRightFacing"
  | "perspectiveBelow"
  | "perspectiveContrastingLeftFacing"
  | "perspectiveContrastingRightFacing"
  | "perspectiveFront"
  | "perspectiveHeroicExtremeLeftFacing"
  | "perspectiveHeroicExtremeRightFacing"
  | "perspectiveHeroicLeftFacing"
  | "perspectiveHeroicRightFacing"
  | "perspectiveLeft"
  | "perspectiveRelaxed"
  | "perspectiveRelaxedModerately"
  | "perspectiveRight";

/**
 * Preset material type
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetMaterialType)
 */
export type PresetMaterialType =
  | "clear"
  | "dkEdge"
  | "flat"
  | "legacyMatte"
  | "legacyMetal"
  | "legacyPlastic"
  | "legacyWireframe"
  | "matte"
  | "metal"
  | "plastic"
  | "powder"
  | "softEdge"
  | "softmetal"
  | "translucentPowder"
  | "warmMatte";

/**
 * Rectangle alignment
 * @see ECMA-376 Part 1, Section 20.1.10.53 (ST_RectAlignment)
 */
export type RectAlignment =
  | "b"
  | "bl"
  | "br"
  | "ctr"
  | "l"
  | "r"
  | "t"
  | "tl"
  | "tr";

/**
 * Fill types supported by fill overlay
 * @see ECMA-376 Part 1, Section 20.1.8.29 (fillOverlay)
 */
export type FillEffectType =
  | "solidFill"
  | "gradFill"
  | "blipFill"
  | "pattFill"
  | "grpFill";

/**
 * Blend effect
 * @see ECMA-376 Part 1, Section 20.1.8.12 (blend)
 */
export type BlendEffect = {
  readonly type: "blend";
  readonly blend: BlendMode;
  readonly containerType?: EffectContainerType;
  readonly name?: string;
  readonly container?: EffectContainer;
};

/**
 * Effect container
 * @see ECMA-376 Part 1, Section 20.1.8.20 (cont)
 */
export type EffectContainer = {
  readonly name?: string;
  readonly type?: EffectContainerType;
};

/**
 * Color change effect
 * @see ECMA-376 Part 1, Section 20.1.8.16 (clrChange)
 */
export type ColorChangeEffect = {
  readonly from: Color;
  readonly to: Color;
  readonly useAlpha: boolean;
};

/**
 * Color replace effect
 * @see ECMA-376 Part 1, Section 20.1.8.18 (clrRepl)
 */
export type ColorReplaceEffect = {
  readonly color: Color;
};

/**
 * Duotone effect
 * @see ECMA-376 Part 1, Section 20.1.8.23 (duotone)
 */
export type DuotoneEffect = {
  readonly colors: readonly [Color, Color];
};

/**
 * Fill overlay effect
 * @see ECMA-376 Part 1, Section 20.1.8.29 (fillOverlay)
 */
export type FillOverlayEffect = {
  readonly blend: BlendMode;
  readonly fillType: FillEffectType;
};

/**
 * Gray scale effect
 * @see ECMA-376 Part 1, Section 20.1.8.34 (grayscl)
 */
export type GrayscaleEffect = {
  readonly type: "grayscl";
};

/**
 * Preset shadow values
 * @see ECMA-376 Part 1, Section 20.1.10.52 (ST_PresetShadowVal)
 */
export type PresetShadowValue =
  | "shdw1"
  | "shdw2"
  | "shdw3"
  | "shdw4"
  | "shdw5"
  | "shdw6"
  | "shdw7"
  | "shdw8"
  | "shdw9"
  | "shdw10"
  | "shdw11"
  | "shdw12"
  | "shdw13"
  | "shdw14"
  | "shdw15"
  | "shdw16"
  | "shdw17"
  | "shdw18"
  | "shdw19"
  | "shdw20";

/**
 * Preset shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.49 (prstShdw)
 */
export type PresetShadowEffect = {
  readonly type: "preset";
  readonly preset: PresetShadowValue;
  readonly color: Color;
  readonly direction: Degrees;
  readonly distance: Pixels;
};

/**
 * Relative offset effect
 * @see ECMA-376 Part 1, Section 20.1.8.51 (relOff)
 */
export type RelativeOffsetEffect = {
  readonly offsetX: Percent;
  readonly offsetY: Percent;
};

/**
 * Combined effects container
 */
export type Effects = {
  readonly shadow?: ShadowEffect;
  readonly glow?: GlowEffect;
  readonly reflection?: ReflectionEffect;
  readonly softEdge?: SoftEdgeEffect;
  readonly alphaBiLevel?: AlphaBiLevelEffect;
  readonly alphaCeiling?: AlphaCeilingEffect;
  readonly alphaFloor?: AlphaFloorEffect;
  readonly alphaInv?: AlphaInverseEffect;
  readonly alphaMod?: AlphaModulateEffect;
  readonly alphaModFix?: AlphaModulateFixedEffect;
  readonly alphaOutset?: AlphaOutsetEffect;
  readonly alphaRepl?: AlphaReplaceEffect;
  readonly biLevel?: BiLevelEffect;
  readonly blend?: BlendEffect;
  readonly colorChange?: ColorChangeEffect;
  readonly colorReplace?: ColorReplaceEffect;
  readonly duotone?: DuotoneEffect;
  readonly fillOverlay?: FillOverlayEffect;
  readonly grayscale?: GrayscaleEffect;
  readonly presetShadow?: PresetShadowEffect;
  readonly relativeOffset?: RelativeOffsetEffect;
};

// =============================================================================
// Resource References
// =============================================================================

/**
 * Resource identifier (relationship ID)
 */
export type ResourceId = string;

/**
 * Resolved resource path
 */
export type ResourcePath = string;

/**
 * Hyperlink destination
 */
export type Hyperlink = {
  readonly id: ResourceId;
  readonly tooltip?: string;
  readonly action?: string;
  readonly sound?: HyperlinkSound;
};

/**
 * Hyperlink sound reference
 * @see ECMA-376 Part 1, Section 20.1.2.2.32 (snd)
 */
export type HyperlinkSound = {
  readonly embed: ResourceId;
  readonly name?: string;
};
