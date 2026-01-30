/**
 * @file Build command type definitions
 */

/**
 * All supported preset shape types
 * Based on ECMA-376 Part 1: §20.1.10.56 ST_ShapeType
 */
export type PresetShapeType =
  // Basic shapes
  | "rectangle" | "ellipse" | "triangle" | "rtTriangle" | "diamond"
  | "pentagon" | "hexagon" | "heptagon" | "octagon" | "decagon" | "dodecagon"
  | "parallelogram" | "trapezoid"
  | "teardrop" | "halfFrame" | "corner" | "diagStripe" | "chord"
  | "funnel" | "gear6" | "gear9" | "pie" | "pieWedge" | "blockArc"
  // Rounded/Snipped rectangles
  | "roundRect" | "round1Rect" | "round2SameRect" | "round2DiagRect"
  | "snip1Rect" | "snip2SameRect" | "snip2DiagRect" | "snipRoundRect"
  // Block arrows
  | "rightArrow" | "leftArrow" | "upArrow" | "downArrow"
  | "leftRightArrow" | "upDownArrow" | "bentArrow" | "uturnArrow"
  | "chevron" | "notchedRightArrow" | "stripedRightArrow"
  | "quadArrow" | "quadArrowCallout" | "leftRightUpArrow" | "leftUpArrow" | "bentUpArrow"
  | "curvedLeftArrow" | "curvedRightArrow" | "curvedUpArrow" | "curvedDownArrow"
  | "circularArrow" | "swooshArrow" | "leftCircularArrow" | "leftRightCircularArrow"
  | "leftArrowCallout" | "rightArrowCallout" | "upArrowCallout" | "downArrowCallout"
  | "leftRightArrowCallout" | "upDownArrowCallout"
  // Stars & Banners
  | "star4" | "star5" | "star6" | "star7" | "star8" | "star10" | "star12" | "star16" | "star24" | "star32"
  | "ribbon" | "ribbon2" | "ellipseRibbon" | "ellipseRibbon2"
  | "verticalScroll" | "horizontalScroll" | "wave" | "doubleWave"
  | "irregularSeal1" | "irregularSeal2"
  // Callouts
  | "wedgeRectCallout" | "wedgeRoundRectCallout" | "wedgeEllipseCallout" | "cloudCallout"
  | "borderCallout1" | "borderCallout2" | "borderCallout3"
  | "accentCallout1" | "accentCallout2" | "accentCallout3"
  | "accentBorderCallout1" | "accentBorderCallout2" | "accentBorderCallout3"
  | "callout1" | "callout2" | "callout3"
  // Flowchart shapes
  | "flowChartProcess" | "flowChartDecision" | "flowChartTerminator"
  | "flowChartDocument" | "flowChartData" | "flowChartConnector"
  | "flowChartAlternateProcess" | "flowChartSort" | "flowChartExtract" | "flowChartMerge"
  | "flowChartOnlineStorage" | "flowChartMagneticTape" | "flowChartMagneticDisk" | "flowChartMagneticDrum"
  | "flowChartDisplay" | "flowChartDelay" | "flowChartPreparation"
  | "flowChartManualInput" | "flowChartManualOperation"
  | "flowChartPunchedCard" | "flowChartPunchedTape"
  | "flowChartSummingJunction" | "flowChartOr" | "flowChartCollate"
  | "flowChartInternalStorage" | "flowChartMultidocument"
  | "flowChartOffpageConnector" | "flowChartPredefinedProcess"
  // Math shapes
  | "mathPlus" | "mathMinus" | "mathMultiply" | "mathDivide" | "mathEqual" | "mathNotEqual"
  // Braces & Brackets
  | "leftBrace" | "rightBrace" | "leftBracket" | "rightBracket" | "bracePair" | "bracketPair"
  // Action Buttons
  | "actionButtonBackPrevious" | "actionButtonBeginning" | "actionButtonBlank" | "actionButtonDocument"
  | "actionButtonEnd" | "actionButtonForwardNext" | "actionButtonHelp" | "actionButtonHome"
  | "actionButtonInformation" | "actionButtonMovie" | "actionButtonReturn" | "actionButtonSound"
  // Misc shapes
  | "heart" | "lightning" | "lightningBolt" | "sun" | "moon" | "cloud" | "arc" | "donut"
  | "frame" | "cube" | "can" | "foldedCorner" | "smileyFace" | "noSmoking"
  | "plus" | "cross" | "homePlate" | "plaque" | "bevel" | "rect" | "line";

// =============================================================================
// Line Types
// =============================================================================

/**
 * Line dash style
 * Based on ECMA-376 Part 1: §20.1.10.49 ST_PresetLineDashVal
 */
export type LineDashStyle =
  | "solid"
  | "dash"
  | "dashDot"
  | "dot"
  | "lgDash"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot"
  | "sysDot";

/**
 * Line cap style
 */
export type LineCapStyle = "flat" | "round" | "square";

/**
 * Line join style
 */
export type LineJoinStyle = "bevel" | "miter" | "round";

/**
 * Compound line style
 * Based on ECMA-376 Part 1: §20.1.10.33 ST_CompoundLine
 */
export type LineCompoundStyle = "single" | "double" | "thickThin" | "thinThick" | "triple";

/**
 * Line end type
 */
export type LineEndType = "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";

/**
 * Line end size
 */
export type LineEndSize = "sm" | "med" | "lg";

/**
 * Line end specification
 */
export type LineEndSpec = {
  readonly type: LineEndType;
  readonly width?: LineEndSize;
  readonly length?: LineEndSize;
};

// =============================================================================
// Color Types
// =============================================================================

/**
 * Theme color type
 * Based on ECMA-376 Part 1: §20.1.10.54 ST_SchemeColorVal
 */
export type ThemeColorType =
  | "dk1" | "lt1" | "dk2" | "lt2"
  | "accent1" | "accent2" | "accent3" | "accent4" | "accent5" | "accent6"
  | "hlink" | "folHlink"
  | "bg1" | "bg2" | "tx1" | "tx2";

/**
 * Theme color specification with optional luminance modifiers
 */
export type ThemeColorSpec = {
  readonly theme: ThemeColorType;
  readonly lumMod?: number; // luminance modulate (0-100, percentage)
  readonly lumOff?: number; // luminance offset (-100 to 100, percentage)
  readonly tint?: number;   // tint (0-100, percentage)
  readonly shade?: number;  // shade (0-100, percentage)
};

/**
 * Color specification - can be hex string or theme color reference
 */
export type ColorSpec = string | ThemeColorSpec;

/**
 * Check if a color spec is a theme color
 */
export function isThemeColor(color: ColorSpec): color is ThemeColorSpec {
  return typeof color === "object" && "theme" in color;
}

// =============================================================================
// Fill Types
// =============================================================================

/**
 * Gradient stop specification
 */
export type GradientStopSpec = {
  readonly position: number; // 0-100 percentage
  readonly color: ColorSpec; // hex color or theme color
};

/**
 * Gradient fill specification
 */
export type GradientFillSpec = {
  readonly type: "gradient";
  readonly gradientType: "linear" | "radial" | "path";
  readonly angle?: number; // degrees for linear gradient
  readonly stops: readonly GradientStopSpec[];
};

/**
 * Pattern preset type
 * Based on ECMA-376 Part 1: §20.1.10.51 ST_PresetPatternVal
 */
export type PatternPreset =
  | "pct5" | "pct10" | "pct20" | "pct25" | "pct30" | "pct40"
  | "pct50" | "pct60" | "pct70" | "pct75" | "pct80" | "pct90"
  | "horz" | "vert" | "ltHorz" | "ltVert" | "dkHorz" | "dkVert"
  | "narHorz" | "narVert" | "dashHorz" | "dashVert"
  | "cross" | "dnDiag" | "upDiag" | "ltDnDiag" | "ltUpDiag"
  | "dkDnDiag" | "dkUpDiag" | "wdDnDiag" | "wdUpDiag"
  | "dashDnDiag" | "dashUpDiag" | "diagCross" | "smCheck"
  | "lgCheck" | "smGrid" | "lgGrid" | "dotGrid"
  | "smConfetti" | "lgConfetti" | "horzBrick" | "diagBrick"
  | "solidDmnd" | "openDmnd" | "dotDmnd" | "plaid" | "sphere"
  | "weave" | "divot" | "shingle" | "wave" | "trellis" | "zigZag";

/**
 * Pattern fill specification
 */
export type PatternFillSpec = {
  readonly type: "pattern";
  readonly preset: PatternPreset;
  readonly fgColor: ColorSpec; // foreground color (hex or theme)
  readonly bgColor: ColorSpec; // background color (hex or theme)
};

/**
 * Solid fill specification (explicit)
 */
export type SolidFillSpec = {
  readonly type: "solid";
  readonly color: ColorSpec; // hex color or theme color
};

/**
 * Theme fill specification (shorthand for solid theme color fill)
 */
export type ThemeFillSpec = {
  readonly type: "theme";
  readonly theme: ThemeColorType;
  readonly lumMod?: number;
  readonly lumOff?: number;
  readonly tint?: number;
  readonly shade?: number;
};

/**
 * Fill specification union type
 */
export type FillSpec = string | SolidFillSpec | GradientFillSpec | PatternFillSpec | ThemeFillSpec;

// =============================================================================
// Effect Types
// =============================================================================

/**
 * Shadow effect specification
 * Based on ECMA-376 Part 1: §20.1.8.49 (outerShdw)
 */
export type ShadowEffectSpec = {
  readonly color: string; // hex color
  readonly blur?: number; // blur radius in pixels
  readonly distance?: number; // distance in pixels
  readonly direction?: number; // direction in degrees (0-360)
};

/**
 * Glow effect specification
 * Based on ECMA-376 Part 1: §20.1.8.32 (glow)
 */
export type GlowEffectSpec = {
  readonly color: string; // hex color
  readonly radius: number; // radius in pixels
};

/**
 * Soft edge effect specification
 * Based on ECMA-376 Part 1: §20.1.8.53 (softEdge)
 */
export type SoftEdgeEffectSpec = {
  readonly radius: number; // radius in pixels
};

/**
 * Reflection effect specification
 * Based on ECMA-376 Part 1: §20.1.8.50 (reflection)
 */
export type ReflectionEffectSpec = {
  readonly blurRadius?: number; // blur radius in pixels (default: 0)
  readonly startOpacity?: number; // start opacity 0-100 (default: 100)
  readonly endOpacity?: number; // end opacity 0-100 (default: 0)
  readonly distance?: number; // distance in pixels (default: 0)
  readonly direction?: number; // direction in degrees (default: 0)
  readonly fadeDirection?: number; // fade direction in degrees (default: 90)
  readonly scaleX?: number; // horizontal scale 0-100 (default: 100)
  readonly scaleY?: number; // vertical scale 0-100 (default: -100 for mirror)
};

/**
 * Combined effects specification
 */
export type EffectsSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
  readonly softEdge?: SoftEdgeEffectSpec;
  readonly reflection?: ReflectionEffectSpec;
};

// =============================================================================
// 3D Types
// =============================================================================

/**
 * Bevel preset type
 * Based on ECMA-376 Part 1: §20.1.10.9 ST_BevelPresetType
 */
export type BevelPreset =
  | "angle"
  | "artDeco"
  | "circle"
  | "convex"
  | "coolSlant"
  | "cross"
  | "divot"
  | "hardEdge"
  | "relaxedInset"
  | "riblet"
  | "slope"
  | "softRound";

/**
 * Bevel specification
 */
export type BevelSpec = {
  readonly preset?: BevelPreset;
  readonly width?: number; // in pixels
  readonly height?: number; // in pixels
};

/**
 * Material preset type
 * Based on ECMA-376 Part 1: §20.1.10.50 ST_PresetMaterialType
 */
export type MaterialPreset =
  | "matte"
  | "warmMatte"
  | "plastic"
  | "metal"
  | "powder"
  | "flat"
  | "softEdge"
  | "clear";

/**
 * 3D shape properties specification
 */
export type Shape3dSpec = {
  readonly bevelTop?: BevelSpec;
  readonly bevelBottom?: BevelSpec;
  readonly material?: MaterialPreset;
  readonly extrusionHeight?: number; // depth in pixels
};

// =============================================================================
// Text Types
// =============================================================================

/**
 * Text alignment
 */
export type TextAlignment = "left" | "center" | "right" | "justify";

/**
 * Underline style
 */
export type UnderlineStyle = "none" | "single" | "double" | "heavy" | "dotted" | "dashed" | "wavy";

/**
 * Strikethrough style
 */
export type StrikeStyle = "none" | "single" | "double";

/**
 * Text capitalization style
 * Based on ECMA-376 Part 1: §21.1.2.1.6 ST_TextCapsType
 */
export type TextCapsStyle = "none" | "small" | "all";

/**
 * Text vertical position (superscript/subscript)
 */
export type TextVerticalPosition = "normal" | "superscript" | "subscript";

/**
 * Bullet type
 */
export type BulletType = "none" | "char" | "autoNum";

/**
 * Bullet specification
 */
export type BulletSpec = {
  readonly type: BulletType;
  readonly char?: string; // for char bullet type
  readonly autoNumType?: string; // for autoNum type (e.g., "arabicPeriod", "romanUcPeriod")
};

/**
 * Text effect specification (shadow, glow for text)
 */
export type TextEffectSpec = {
  readonly shadow?: ShadowEffectSpec;
  readonly glow?: GlowEffectSpec;
};

/**
 * Text outline specification
 */
export type TextOutlineSpec = {
  readonly color: string; // hex color
  readonly width?: number; // in pixels
};

/**
 * Hyperlink specification
 */
export type HyperlinkSpec = {
  readonly url: string;
  readonly tooltip?: string;
};

/**
 * Text run specification - a portion of text with specific formatting
 */
export type TextRunSpec = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly strikethrough?: StrikeStyle;
  readonly caps?: TextCapsStyle; // all caps, small caps
  readonly verticalPosition?: TextVerticalPosition; // superscript, subscript
  readonly letterSpacing?: number; // in pixels (can be negative)
  readonly fontSize?: number; // in points
  readonly fontFamily?: string;
  readonly color?: string; // hex color
  readonly outline?: TextOutlineSpec; // text stroke
  readonly effects?: TextEffectSpec;
  readonly hyperlink?: HyperlinkSpec; // clickable hyperlink
};

/**
 * Line spacing specification
 */
export type LineSpacingSpec =
  | { readonly type: "percent"; readonly value: number } // e.g., 150 for 1.5x
  | { readonly type: "points"; readonly value: number }; // e.g., 18 for 18pt

/**
 * Text paragraph specification
 */
export type TextParagraphSpec = {
  readonly runs: readonly TextRunSpec[];
  readonly alignment?: TextAlignment;
  readonly bullet?: BulletSpec;
  readonly level?: number; // indent level (0-8)
  readonly lineSpacing?: LineSpacingSpec; // line height
  readonly spaceBefore?: number; // points before paragraph
  readonly spaceAfter?: number; // points after paragraph
  readonly indent?: number; // first line indent in pixels
  readonly marginLeft?: number; // left margin in pixels
};

/**
 * Rich text body specification - array of paragraphs
 */
export type RichTextSpec = readonly TextParagraphSpec[];

/**
 * Text specification - can be simple string or rich text
 */
export type TextSpec = string | RichTextSpec;

/**
 * Vertical text anchor
 * Based on ECMA-376 Part 1: §21.1.2.1.3 ST_TextAnchoringType
 */
export type TextAnchor = "top" | "center" | "bottom";

/**
 * Text vertical type (rotation)
 * Based on ECMA-376 Part 1: §21.1.2.1.39 ST_TextVerticalType
 */
export type TextVerticalType = "horz" | "vert" | "vert270" | "wordArtVert" | "eaVert";

/**
 * Text wrapping mode
 */
export type TextWrapping = "none" | "square";

/**
 * Text body properties specification
 */
export type TextBodyPropertiesSpec = {
  readonly anchor?: TextAnchor; // vertical alignment: top, center, bottom
  readonly verticalType?: TextVerticalType; // text orientation
  readonly wrapping?: TextWrapping;
  readonly anchorCenter?: boolean; // center text horizontally
  readonly insetLeft?: number; // left margin in pixels
  readonly insetTop?: number; // top margin in pixels
  readonly insetRight?: number; // right margin in pixels
  readonly insetBottom?: number; // bottom margin in pixels
};

// =============================================================================
// Shape Specification
// =============================================================================

/**
 * Placeholder type (subset of ECMA-376 ST_PlaceholderType)
 */
export type PlaceholderType =
  | "title"
  | "body"
  | "ctrTitle"
  | "subTitle"
  | "dt"
  | "sldNum"
  | "ftr"
  | "hdr"
  | "obj"
  | "chart"
  | "tbl"
  | "clipArt"
  | "dgm"
  | "media"
  | "sldImg"
  | "pic";

export type PlaceholderSpec = {
  readonly type: PlaceholderType;
  readonly idx?: number;
};

/**
 * Shape specification for building
 */
export type ShapeSpec = {
  readonly type: PresetShapeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly placeholder?: PlaceholderSpec;
  /**
   * Custom geometry definition (a:custGeom).
   * When provided, this overrides the preset geometry.
   */
  readonly customGeometry?: CustomGeometrySpec;
  // Text - can be simple string or rich text paragraphs
  readonly text?: TextSpec;
  // Text body properties (vertical alignment, orientation, margins)
  readonly textBody?: TextBodyPropertiesSpec;
  // Transform properties
  readonly rotation?: number; // degrees 0-360
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  // Fill - can be hex string or structured fill spec
  readonly fill?: FillSpec;
  // Line properties
  readonly lineColor?: string;
  readonly lineWidth?: number;
  readonly lineDash?: LineDashStyle;
  readonly lineCap?: LineCapStyle;
  readonly lineJoin?: LineJoinStyle;
  readonly lineCompound?: LineCompoundStyle;
  readonly lineHeadEnd?: LineEndSpec;
  readonly lineTailEnd?: LineEndSpec;
  // Effects
  readonly effects?: EffectsSpec;
  // 3D properties
  readonly shape3d?: Shape3dSpec;
};

// =============================================================================
// Custom Geometry Types
// =============================================================================

export type CustomGeometrySpec = {
  readonly paths: readonly GeometryPathSpec[];
};

export type GeometryPathFillMode = "none" | "norm" | "lighten" | "lightenLess" | "darken" | "darkenLess";

export type GeometryPathSpec = {
  readonly width: number;
  readonly height: number;
  readonly fill: GeometryPathFillMode;
  readonly stroke: boolean;
  readonly extrusionOk: boolean;
  readonly commands: readonly PathCommandSpec[];
};

export type MoveToSpec = { readonly type: "moveTo"; readonly x: number; readonly y: number };
export type LineToSpec = { readonly type: "lineTo"; readonly x: number; readonly y: number };
export type ArcToSpec = {
  readonly type: "arcTo";
  readonly widthRadius: number;
  readonly heightRadius: number;
  readonly startAngle: number;
  readonly swingAngle: number;
};
export type QuadBezierToSpec = {
  readonly type: "quadBezierTo";
  readonly control: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};
export type CubicBezierToSpec = {
  readonly type: "cubicBezierTo";
  readonly control1: { readonly x: number; readonly y: number };
  readonly control2: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};
export type CloseSpec = { readonly type: "close" };

export type PathCommandSpec = MoveToSpec | LineToSpec | ArcToSpec | QuadBezierToSpec | CubicBezierToSpec | CloseSpec;

// =============================================================================
// Blip Effects Types
// =============================================================================

/**
 * Blip effect specification for image color transforms
 * Based on ECMA-376 Part 1: §20.1.8.13 CT_Blip
 */
export type BlipEffectSpec = {
  /** Alpha bi-level effect (threshold 0-100) */
  readonly alphaBiLevel?: { readonly threshold: number };
  /** Alpha ceiling effect */
  readonly alphaCeiling?: boolean;
  /** Alpha floor effect */
  readonly alphaFloor?: boolean;
  /** Alpha invert effect */
  readonly alphaInv?: boolean;
  /** Alpha modulation effect */
  readonly alphaMod?: boolean;
  /** Convert to grayscale */
  readonly grayscale?: boolean;
  /** Duotone effect with two colors */
  readonly duotone?: { readonly colors: readonly [ColorSpec, ColorSpec] };
  /** Tint effect (hue in degrees, amount 0-100) */
  readonly tint?: { readonly hue: number; readonly amount: number };
  /** Luminance adjustment (brightness and contrast -100 to 100) */
  readonly luminance?: { readonly brightness: number; readonly contrast: number };
  /** HSL adjustment (hue in degrees, saturation and luminance 0-100) */
  readonly hsl?: { readonly hue: number; readonly saturation: number; readonly luminance: number };
  /** Blur effect (radius in pixels) */
  readonly blur?: { readonly radius: number };
  /** Alpha modulation (0-100) */
  readonly alphaModFix?: number;
  /** Alpha replacement (alpha 0-100) */
  readonly alphaRepl?: { readonly alpha: number };
  /** Bi-level effect (threshold 0-100) */
  readonly biLevel?: { readonly threshold: number };
  /** Color change effect */
  readonly colorChange?: { readonly from: ColorSpec; readonly to: ColorSpec; readonly useAlpha?: boolean };
  /** Color replace effect */
  readonly colorReplace?: { readonly color: ColorSpec };
};

/**
 * Image specification for building
 */
export type ImageSpec = {
  readonly type: "image";
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Image effects (grayscale, tint, etc.) */
  readonly effects?: BlipEffectSpec;
  /**
   * Optional embedded media attached to the picture shape (e.g., video).
   * The image acts as a poster frame.
   */
  readonly media?: MediaEmbedSpec;
};

export type MediaEmbedSpec = {
  readonly type: "video" | "audio";
  readonly path: string;
};

/**
 * Connector specification for building
 */
export type ConnectorSpec = {
  readonly type: "connector";
  readonly preset?: "straightConnector1" | "bentConnector3" | "curvedConnector3";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly startShapeId?: string;
  readonly startSiteIndex?: number;
  readonly endShapeId?: string;
  readonly endSiteIndex?: number;
  readonly lineColor?: string;
  readonly lineWidth?: number;
};

/**
 * Group specification for building
 */
export type GroupSpec = {
  readonly type: "group";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly children: readonly (ShapeSpec | GroupSpec)[];
  readonly fill?: string;
};

/**
 * Table cell specification
 */
export type TableCellSpec = {
  readonly text: string;
};

/**
 * Table specification
 */
export type TableSpec = {
  readonly type: "table";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly (readonly TableCellSpec[])[];
};

// =============================================================================
// Chart Types (patch existing embedded charts)
// =============================================================================

export type ChartSeriesSpec = {
  readonly name: string;
  readonly values: readonly number[];
};

export type ChartDataSpec = {
  readonly categories: readonly string[];
  readonly series: readonly ChartSeriesSpec[];
};

export type ChartTransformSpec = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
};

export type ChartUpdateSpec = {
  /** Relationship ID referenced from the slide (e.g., "rId2") */
  readonly resourceId: string;
  readonly title?: string;
  readonly data?: ChartDataSpec;
  readonly styleId?: number;
  readonly transform?: ChartTransformSpec;
};

export type ChartAddSpec = {
  readonly chartType: "barChart" | "lineChart" | "pieChart";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title?: string;
  readonly data: ChartDataSpec;
  readonly styleId?: number;
};

// =============================================================================
// Background Types
// =============================================================================

/**
 * Solid background fill specification
 */
export type BackgroundSolidSpec = {
  readonly type: "solid";
  readonly color: string; // hex color
};

/**
 * Gradient background fill specification
 */
export type BackgroundGradientSpec = {
  readonly type: "gradient";
  readonly stops: readonly GradientStopSpec[];
  readonly angle?: number; // degrees for linear gradient
};

/**
 * Image background fill specification
 */
export type BackgroundImageSpec = {
  readonly type: "image";
  readonly path: string;
  readonly mode?: "stretch" | "tile" | "cover";
};

/**
 * Background fill specification union type
 * Can be a hex color string for solid fill, or structured spec
 */
export type BackgroundFillSpec =
  | string // hex color for solid fill
  | BackgroundSolidSpec
  | BackgroundGradientSpec
  | BackgroundImageSpec;

// =============================================================================
// Transition Types
// =============================================================================

export type TransitionType =
  | "blinds"
  | "checker"
  | "circle"
  | "comb"
  | "cover"
  | "cut"
  | "diamond"
  | "dissolve"
  | "fade"
  | "newsflash"
  | "plus"
  | "pull"
  | "push"
  | "random"
  | "randomBar"
  | "split"
  | "strips"
  | "wedge"
  | "wheel"
  | "wipe"
  | "zoom"
  | "none";

export type SlideTransitionSpec = {
  readonly type: TransitionType;
  readonly duration?: number; // milliseconds
  readonly advanceOnClick?: boolean;
  readonly advanceAfter?: number; // milliseconds
  readonly direction?: "l" | "r" | "u" | "d" | "ld" | "lu" | "rd" | "ru";
  readonly orientation?: "horz" | "vert";
  readonly spokes?: 1 | 2 | 3 | 4 | 8;
  readonly inOutDirection?: "in" | "out";
};

/**
 * Slide modification specification
 */
export type SlideModSpec = {
  readonly slideNumber: number;
  readonly background?: BackgroundFillSpec;
  readonly transition?: SlideTransitionSpec;
  readonly addCharts?: readonly ChartAddSpec[];
  readonly updateCharts?: readonly ChartUpdateSpec[];
  readonly addShapes?: readonly ShapeSpec[];
  readonly addImages?: readonly ImageSpec[];
  readonly addConnectors?: readonly ConnectorSpec[];
  readonly addGroups?: readonly GroupSpec[];
  readonly addTables?: readonly TableSpec[];
};

/**
 * Build specification
 */
export type BuildSpec = {
  readonly template: string;
  readonly output: string;
  /**
   * Theme edits applied to a specific theme XML part (e.g., ppt/theme/theme1.xml).
   * This is applied before any slide modifications.
   */
  readonly theme?: ThemeEditSpec;
  readonly slides?: readonly SlideModSpec[];
};

/**
 * Build result
 */
export type BuildData = {
  readonly outputPath: string;
  readonly slideCount: number;
  readonly shapesAdded: number;
};

// =============================================================================
// Theme Editing Types
// =============================================================================

/**
 * Theme color scheme slot names (the 12 entries in a:clrScheme)
 */
export type ThemeSchemeColorName =
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
 * Color scheme edit - partial updates to a:clrScheme entries using hex colors.
 */
export type ThemeColorSchemeEditSpec = Partial<Record<ThemeSchemeColorName, string>>;

/**
 * Font spec edit for major/minor fonts
 */
export type ThemeFontSpec = {
  readonly latin?: string;
  readonly eastAsian?: string;
  readonly complexScript?: string;
};

/**
 * Font scheme edit - partial updates to major/minor fonts
 */
export type ThemeFontSchemeEditSpec = {
  readonly majorFont?: ThemeFontSpec;
  readonly minorFont?: ThemeFontSpec;
};

/**
 * Theme editing specification
 */
export type ThemeEditSpec = {
  /**
   * Target theme XML part path inside the PPTX zip (e.g., "ppt/theme/theme1.xml").
   * Required when theme edits are specified.
   */
  readonly path?: string;
  readonly colorScheme?: ThemeColorSchemeEditSpec;
  readonly fontScheme?: ThemeFontSchemeEditSpec;
};
