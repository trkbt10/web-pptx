/**
 * @file PresentationML (p:) namespace element types
 *
 * PresentationML defines the structure of PowerPoint presentations.
 * It includes slides, shapes, placeholders, and slide layouts.
 *
 * @see ECMA-376 Part 1, Section 19.3 - PresentationML
 * @see src/pptx/parser/simplify.ts - XML simplification process
 */

import type { OoxmlElement, OoxmlChild } from "./base";
import type { FillElements, BlipFillElement } from "./color";
import type {
  TextBodyElement,
  TransformElement,
  PresetGeometryElement,
  CustomGeometryElement,
  LinePropertiesElement,
  Scene3DElement,
  SP3DElement,
  ListStyleElement,
} from "./drawingml";
import type { XmlElement } from "../../xml";
import { isXmlElement, getChild } from "../../xml";

// =============================================================================
// Shape Elements
// =============================================================================

/**
 * Shape element (p:sp) - basic shape with optional text.
 *
 * @example
 * ```xml
 * <p:sp>
 *   <p:nvSpPr>...</p:nvSpPr>
 *   <p:spPr>...</p:spPr>
 *   <p:txBody>...</p:txBody>
 * </p:sp>
 * ```
 */
export type ShapeElement = OoxmlElement & {
  /** Non-visual shape properties */
  "p:nvSpPr"?: NonVisualShapePropertiesElement;
  /** Shape properties */
  "p:spPr"?: ShapePropertiesElement;
  /** Text body */
  "p:txBody"?: TextBodyElement;
  /** Shape style */
  "p:style"?: ShapeStyleElement;
  /** Text transform (for text rotation different from shape) */
  "p:txXfrm"?: TransformElement;
};

/**
 * Connection shape element (p:cxnSp) - connector lines.
 */
export type ConnectionShapeElement = OoxmlElement & {
  /** Non-visual properties */
  "p:nvCxnSpPr"?: NonVisualConnectionShapePropertiesElement;
  /** Shape properties */
  "p:spPr"?: ShapePropertiesElement;
  /** Style */
  "p:style"?: ShapeStyleElement;
};

/**
 * Alternate content element for picture (blipFill fallback).
 * Used when images have Mac-specific versions with PNG fallbacks.
 */
export type PictureAlternateContentElement = OoxmlElement & {
  /** Choice element (preferred content, e.g., PDF for Mac) */
  "mc:Choice"?: OoxmlElement & {
    "p:blipFill"?: BlipFillElement;
  };
  /** Fallback element (compatibility content, e.g., PNG) */
  "mc:Fallback"?: OoxmlElement & {
    "p:blipFill"?: BlipFillElement;
  };
};

/**
 * Picture element (p:pic) - embedded image.
 */
export type PictureElement = OoxmlElement & {
  /** Non-visual picture properties */
  "p:nvPicPr"?: NonVisualPicturePropertiesElement;
  /** Blip fill (image reference) - direct child */
  "p:blipFill"?: BlipFillElement;
  /** Alternate content for blip fill (used for Mac/Windows compatibility) */
  "mc:AlternateContent"?: PictureAlternateContentElement;
  /** Shape properties */
  "p:spPr"?: ShapePropertiesElement;
};

/**
 * Group shape element (p:grpSp) - container for multiple shapes.
 */
export type GroupShapeElement = OoxmlElement & {
  /** Non-visual group properties */
  "p:nvGrpSpPr"?: NonVisualGroupShapePropertiesElement;
  /** Group shape properties */
  "p:grpSpPr"?: GroupShapePropertiesElement;
  /** Child shapes */
  "p:sp"?: OoxmlChild<ShapeElement>;
  /** Child connection shapes */
  "p:cxnSp"?: OoxmlChild<ConnectionShapeElement>;
  /** Child pictures */
  "p:pic"?: OoxmlChild<PictureElement>;
  /** Child groups */
  "p:grpSp"?: OoxmlChild<GroupShapeElement>;
  /** Child graphic frames */
  "p:graphicFrame"?: OoxmlChild<GraphicFrameElement>;
};

/**
 * Graphic frame element (p:graphicFrame) - container for charts, tables, diagrams.
 */
export type GraphicFrameElement = OoxmlElement & {
  /** Non-visual graphic frame properties */
  "p:nvGraphicFramePr"?: NonVisualGraphicFramePropertiesElement;
  /** Transform */
  "p:xfrm"?: TransformElement;
  /** Graphic content */
  "a:graphic"?: GraphicElement;
};

// =============================================================================
// Non-Visual Properties
// =============================================================================

/**
 * Non-visual shape properties (p:nvSpPr).
 */
export type NonVisualShapePropertiesElement = OoxmlElement & {
  /** Common non-visual properties */
  "p:cNvPr"?: CommonNonVisualPropertiesElement;
  /** Non-visual shape drawing properties */
  "p:cNvSpPr"?: NonVisualShapeDrawingPropertiesElement;
  /** Non-visual properties */
  "p:nvPr"?: NonVisualPropertiesElement;
};

/**
 * Non-visual connection shape properties.
 */
export type NonVisualConnectionShapePropertiesElement = OoxmlElement & {
  "p:cNvPr"?: CommonNonVisualPropertiesElement;
  "p:cNvCxnSpPr"?: OoxmlElement;
  "p:nvPr"?: NonVisualPropertiesElement;
};

/**
 * Non-visual picture properties.
 */
export type NonVisualPicturePropertiesElement = OoxmlElement & {
  "p:cNvPr"?: CommonNonVisualPropertiesElement;
  "p:cNvPicPr"?: OoxmlElement;
  "p:nvPr"?: NonVisualPropertiesElement;
};

/**
 * Non-visual group shape properties.
 */
export type NonVisualGroupShapePropertiesElement = OoxmlElement & {
  "p:cNvPr"?: CommonNonVisualPropertiesElement;
  "p:cNvGrpSpPr"?: OoxmlElement;
  "p:nvPr"?: NonVisualPropertiesElement;
};

/**
 * Non-visual graphic frame properties.
 */
export type NonVisualGraphicFramePropertiesElement = OoxmlElement & {
  "p:cNvPr"?: CommonNonVisualPropertiesElement;
  "p:cNvGraphicFramePr"?: OoxmlElement;
  "p:nvPr"?: NonVisualPropertiesElement;
};

/**
 * Common non-visual properties (p:cNvPr) - shared by all shape types.
 */
export type CommonNonVisualPropertiesAttrs = {
  /** Shape ID */
  id?: string;
  /** Shape name */
  name?: string;
  /** Description */
  descr?: string;
  /** Hidden flag */
  hidden?: string;
  /** Title */
  title?: string;
};

export type CommonNonVisualPropertiesElement = OoxmlElement<CommonNonVisualPropertiesAttrs> & {
  /** Hyperlink click action */
  "a:hlinkClick"?: OoxmlElement;
  /** Hyperlink hover action */
  "a:hlinkHover"?: OoxmlElement;
};

/**
 * Non-visual shape drawing properties.
 */
export type NonVisualShapeDrawingPropertiesAttrs = {
  /** Text box flag */
  txBox?: string;
};

export type NonVisualShapeDrawingPropertiesElement = OoxmlElement<NonVisualShapeDrawingPropertiesAttrs> & {
  /** Shape locks */
  "a:spLocks"?: OoxmlElement;
};

/**
 * Non-visual properties (p:nvPr) - placeholder and application info.
 */
export type NonVisualPropertiesElement = OoxmlElement & {
  /** Placeholder info */
  "p:ph"?: PlaceholderElement;
  /** Customer data */
  "p:custDataLst"?: OoxmlElement;
  /** Audio file info */
  "a:audioFile"?: AudioFileElement;
  /** Video file info */
  "a:videoFile"?: VideoFileElement;
};

/**
 * Placeholder element - references layout placeholders.
 */
export type PlaceholderAttrs = {
  /** Placeholder type (title, body, ctrTitle, subTitle, etc.) */
  type?: string;
  /** Orientation */
  orient?: string;
  /** Size */
  sz?: string;
  /** Index for matching with layout */
  idx?: string;
  /** Has custom prompt */
  hasCustomPrompt?: string;
};

export type PlaceholderElement = OoxmlElement<PlaceholderAttrs>;

/**
 * Media file attributes (shared by audio and video).
 */
export type MediaFileAttrs = {
  "r:link"?: string;
  contentType?: string;
};

/**
 * Video file element.
 */
export type VideoFileAttrs = MediaFileAttrs;
export type VideoFileElement = OoxmlElement<VideoFileAttrs>;

/**
 * Audio file element.
 */
export type AudioFileAttrs = MediaFileAttrs;
export type AudioFileElement = OoxmlElement<AudioFileAttrs>;

// =============================================================================
// Shape Properties
// =============================================================================

// =============================================================================
// Effect Elements (DrawingML a:effectLst children)
// =============================================================================

/**
 * Shadow effect base attributes
 */
export type ShadowEffectAttrs = {
  /** Blur radius in EMUs */
  blurRad?: string;
  /** Distance in EMUs */
  dist?: string;
  /** Direction in 60000ths of a degree */
  dir?: string;
  /** Horizontal scaling */
  sx?: string;
  /** Vertical scaling */
  sy?: string;
  /** Horizontal skew */
  kx?: string;
  /** Vertical skew */
  ky?: string;
  /** Alignment */
  algn?: string;
  /** Rotate with shape */
  rotWithShape?: string;
};

/**
 * Outer shadow element (a:outerShdw)
 */
export type OuterShadowElement = OoxmlElement<ShadowEffectAttrs> & FillElements;

/**
 * Inner shadow element (a:innerShdw)
 */
export type InnerShadowElement = OoxmlElement<ShadowEffectAttrs> & FillElements;

/**
 * Glow effect attributes
 */
export type GlowEffectAttrs = {
  /** Glow radius in EMUs */
  rad?: string;
};

/**
 * Glow effect element (a:glow)
 */
export type GlowElement = OoxmlElement<GlowEffectAttrs> & FillElements;

/**
 * Soft edge effect attributes
 */
export type SoftEdgeAttrs = {
  /** Soft edge radius in EMUs */
  rad?: string;
};

/**
 * Soft edge element (a:softEdge)
 */
export type SoftEdgeElement = OoxmlElement<SoftEdgeAttrs>;

/**
 * Reflection effect attributes
 */
export type ReflectionAttrs = {
  /** Blur radius */
  blurRad?: string;
  /** Start opacity */
  stA?: string;
  /** End opacity */
  endA?: string;
  /** Start position */
  stPos?: string;
  /** End position */
  endPos?: string;
  /** Distance */
  dist?: string;
  /** Direction */
  dir?: string;
  /** Fade direction */
  fadeDir?: string;
  /** Horizontal scaling */
  sx?: string;
  /** Vertical scaling */
  sy?: string;
  /** Horizontal skew */
  kx?: string;
  /** Vertical skew */
  ky?: string;
  /** Alignment */
  algn?: string;
  /** Rotate with shape */
  rotWithShape?: string;
};

/**
 * Reflection element (a:reflection)
 */
export type ReflectionElement = OoxmlElement<ReflectionAttrs>;

/**
 * Effect list element (a:effectLst)
 */
export type EffectListElement = OoxmlElement & {
  /** Outer shadow */
  "a:outerShdw"?: OuterShadowElement;
  /** Inner shadow */
  "a:innerShdw"?: InnerShadowElement;
  /** Glow */
  "a:glow"?: GlowElement;
  /** Soft edge */
  "a:softEdge"?: SoftEdgeElement;
  /** Reflection */
  "a:reflection"?: ReflectionElement;
  /** Blur */
  "a:blur"?: OoxmlElement<{ rad?: string; grow?: string }>;
  /** Preset shadow */
  "a:prstShdw"?: OoxmlElement & FillElements;
};

/**
 * Shape properties element (p:spPr) - visual properties.
 */
export type ShapePropertiesElement = OoxmlElement & FillElements & {
  /** 2D transform */
  "a:xfrm"?: TransformElement;
  /** Preset geometry */
  "a:prstGeom"?: PresetGeometryElement;
  /** Custom geometry */
  "a:custGeom"?: CustomGeometryElement;
  /** Line/outline properties */
  "a:ln"?: LinePropertiesElement;
  /** Effect list */
  "a:effectLst"?: EffectListElement;
  /** Scene 3D - camera and lighting setup */
  "a:scene3d"?: Scene3DElement;
  /** Shape 3D - extrusion, bevel, contour */
  "a:sp3d"?: SP3DElement;
};

/**
 * Group shape properties element.
 */
export type GroupShapePropertiesElement = OoxmlElement & FillElements & {
  /** Group transform */
  "a:xfrm"?: TransformElement;
};

/**
 * Shape style element - references theme styles.
 */
export type ShapeStyleElement = OoxmlElement & {
  /** Line reference */
  "a:lnRef"?: StyleReferenceElement;
  /** Fill reference */
  "a:fillRef"?: StyleReferenceElement;
  /** Effect reference */
  "a:effectRef"?: StyleReferenceElement;
  /** Font reference */
  "a:fontRef"?: FontReferenceElement;
};

/**
 * Style reference element.
 */
export type StyleReferenceAttrs = {
  /** Index into theme style matrix */
  idx?: string;
};

export type StyleReferenceElement = OoxmlElement<StyleReferenceAttrs>;

/**
 * Font reference element.
 */
export type FontReferenceAttrs = {
  /** Font index (minor, major) */
  idx?: string;
};

export type FontReferenceElement = OoxmlElement<FontReferenceAttrs>;

// =============================================================================
// Graphic Content
// =============================================================================

/**
 * Graphic element (a:graphic) - container for graphic data.
 */
export type GraphicElement = OoxmlElement & {
  "a:graphicData"?: GraphicDataElement;
};

/**
 * Graphic data element - contains chart, table, or diagram reference.
 */
export type GraphicDataAttrs = {
  /** URI identifying the graphic type */
  uri?: string;
};

export type GraphicDataElement = OoxmlElement<GraphicDataAttrs> & {
  /** Chart reference */
  "c:chart"?: ChartReferenceElement;
  /** Table */
  "a:tbl"?: TableElement;
  /** Diagram relationships */
  "dgm:relIds"?: DiagramRelIdsElement;
};

/**
 * Chart reference element.
 */
export type ChartReferenceAttrs = {
  "r:id"?: string;
};

export type ChartReferenceElement = OoxmlElement<ChartReferenceAttrs>;

/**
 * Table element (a:tbl).
 */
export type TableElement = OoxmlElement & {
  /** Table properties */
  "a:tblPr"?: TablePropertiesElement;
  /** Table grid */
  "a:tblGrid"?: TableGridElement;
  /** Table rows */
  "a:tr"?: OoxmlChild<TableRowElement>;
};

/**
 * Table properties element (a:tblPr).
 */
export type TablePropertiesAttrs = {
  /** First row is header */
  firstRow?: string;
  /** First column is header */
  firstCol?: string;
  /** Last row is different */
  lastRow?: string;
  /** Last column is different */
  lastCol?: string;
  /** Banded rows */
  bandRow?: string;
  /** Banded columns */
  bandCol?: string;
  /** Right-to-left */
  rtl?: string;
};

export type TablePropertiesElement = OoxmlElement<TablePropertiesAttrs> & {
  /** Table style ID reference */
  "a:tableStyleId"?: string;
};

/**
 * Table grid element (a:tblGrid).
 */
export type TableGridElement = OoxmlElement & {
  /** Grid columns */
  "a:gridCol"?: OoxmlChild<TableGridColElement>;
};

/**
 * Table grid column element (a:gridCol).
 */
export type TableGridColAttrs = {
  /** Column width in EMU */
  w?: string;
};

export type TableGridColElement = OoxmlElement<TableGridColAttrs>;

/**
 * Table row element.
 */
export type TableRowAttrs = {
  /** Row height in EMU */
  h?: string;
};

export type TableRowElement = OoxmlElement<TableRowAttrs> & {
  /** Table cells */
  "a:tc"?: OoxmlChild<TableCellElement>;
};

/**
 * Table cell element.
 */
export type TableCellAttrs = {
  /** Row span */
  rowSpan?: string;
  /** Column span */
  gridSpan?: string;
  /** Horizontal merge */
  hMerge?: string;
  /** Vertical merge */
  vMerge?: string;
};

export type TableCellElement = OoxmlElement<TableCellAttrs> & {
  /** Cell text */
  "a:txBody"?: TextBodyElement;
  /** Cell properties */
  "a:tcPr"?: TableCellPropertiesElement;
};

/**
 * Table cell properties element (a:tcPr).
 */
export type TableCellPropertiesElement = OoxmlElement & FillElements & {
  /** Left border */
  "a:lnL"?: LinePropertiesElement;
  /** Right border */
  "a:lnR"?: LinePropertiesElement;
  /** Top border */
  "a:lnT"?: LinePropertiesElement;
  /** Bottom border */
  "a:lnB"?: LinePropertiesElement;
};

// =============================================================================
// Table Styles (from theme or document)
// =============================================================================

/**
 * Table cell border element within table style.
 * Defines borders for all sides of a cell.
 */
export type TableCellBorderElement = OoxmlElement & {
  /** Left border */
  "a:left"?: LinePropertiesElement;
  /** Right border */
  "a:right"?: LinePropertiesElement;
  /** Top border */
  "a:top"?: LinePropertiesElement;
  /** Bottom border */
  "a:bottom"?: LinePropertiesElement;
  /** Inside horizontal border */
  "a:insideH"?: LinePropertiesElement;
  /** Inside vertical border */
  "a:insideV"?: LinePropertiesElement;
};

/**
 * Fill container element within table cell style.
 */
export type TableCellFillElement = OoxmlElement & FillElements;

/**
 * Table cell style element (a:tcStyle).
 * Defines styling for table cells within a table style part.
 */
export type TableCellStyleElement = OoxmlElement & {
  /** Cell borders */
  "a:tcBdr"?: TableCellBorderElement;
  /** Fill wrapper */
  "a:fill"?: TableCellFillElement;
  /** Fill reference */
  "a:fillRef"?: OoxmlElement;
};

/**
 * Table cell text style element (a:tcTxStyle).
 * Defines text styling for table cells.
 */
export type TableCellTextStyleAttrs = {
  /** Bold */
  b?: "on" | "off";
  /** Italic */
  i?: "on" | "off";
};

export type TableCellTextStyleElement = OoxmlElement<TableCellTextStyleAttrs> & FillElements & {
  /** Font reference */
  "a:fontRef"?: OoxmlElement;
};

/**
 * Table style part element (a:wholeTbl, a:firstRow, a:lastRow, etc.).
 * Represents styling for a portion of the table.
 */
export type TableStylePartElement = OoxmlElement & {
  /** Cell style */
  "a:tcStyle"?: TableCellStyleElement;
  /** Cell text style */
  "a:tcTxStyle"?: TableCellTextStyleElement;
};

/**
 * Table style element (a:tblStyle).
 * Complete style definition for a table.
 */
export type TableStyleAttrs = {
  /** Style ID */
  styleId?: string;
  /** Style name */
  styleName?: string;
};

export type TableStyleElement = OoxmlElement<TableStyleAttrs> & {
  /** Whole table styling */
  "a:wholeTbl"?: TableStylePartElement;
  /** First row styling */
  "a:firstRow"?: TableStylePartElement;
  /** Last row styling */
  "a:lastRow"?: TableStylePartElement;
  /** First column styling */
  "a:firstCol"?: TableStylePartElement;
  /** Last column styling */
  "a:lastCol"?: TableStylePartElement;
  /** Band 1 horizontal styling */
  "a:band1H"?: TableStylePartElement;
  /** Band 2 horizontal styling */
  "a:band2H"?: TableStylePartElement;
  /** Band 1 vertical styling */
  "a:band1V"?: TableStylePartElement;
  /** Band 2 vertical styling */
  "a:band2V"?: TableStylePartElement;
  /** Southeast cell styling */
  "a:seCell"?: TableStylePartElement;
  /** Southwest cell styling */
  "a:swCell"?: TableStylePartElement;
  /** Northeast cell styling */
  "a:neCell"?: TableStylePartElement;
  /** Northwest cell styling */
  "a:nwCell"?: TableStylePartElement;
};

/**
 * Table style list element (a:tblStyleLst).
 * Container for table styles, typically in theme.
 */
export type TableStyleListElement = OoxmlElement & {
  /** Table styles */
  "a:tblStyle"?: OoxmlChild<TableStyleElement>;
};

/**
 * Diagram relationship IDs element.
 */
export type DiagramRelIdsAttrs = {
  "r:dm"?: string;
  "r:lo"?: string;
  "r:qs"?: string;
  "r:cs"?: string;
};

export type DiagramRelIdsElement = OoxmlElement<DiagramRelIdsAttrs>;

// =============================================================================
// Presentation Document (ECMA-376 Section 19.2)
// =============================================================================

/**
 * Presentation document element - wrapper for p:presentation.
 * This represents the root of a parsed presentation.xml file.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.26 (p:presentation)
 */
export type PresentationDocumentElement = OoxmlElement & {
  "p:presentation"?: PresentationElement;
};

/**
 * Presentation element attributes.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.26
 */
export type PresentationElementAttrs = {
  /** Server zoom percentage (default: 50000 = 50%) */
  serverZoom?: string;
  /** First slide number (default: 1) */
  firstSlideNum?: string;
  /** Show special placeholders on title slide (default: true) */
  showSpecialPlsOnTitleSld?: string;
  /** Right-to-left (default: false) */
  rtl?: string;
  /** Remove personal info on save (default: false) */
  removePersonalInfoOnSave?: string;
  /** Compatibility mode (default: false) */
  compatMode?: string;
  /** Strict first and last chars for line breaking (default: true) */
  strictFirstAndLastChars?: string;
  /** Embed TrueType fonts (default: false) */
  embedTrueTypeFonts?: string;
  /** Save subset fonts (default: false) */
  saveSubsetFonts?: string;
  /** Auto compress pictures (default: true) */
  autoCompressPictures?: string;
  /** Bookmark ID seed (default: 1) */
  bookmarkIdSeed?: string;
  /** Document conformance class */
  conformance?: string;
};

/**
 * Presentation element (p:presentation) - root of presentation content.
 *
 * Child elements in document order:
 * - p:sldMasterIdLst (slide master ID list)
 * - p:notesMasterIdLst (notes master ID list)
 * - p:handoutMasterIdLst (handout master ID list)
 * - p:sldIdLst (slide ID list)
 * - p:sldSz (slide size)
 * - p:notesSz (notes size) - REQUIRED
 * - p:smartTags (smart tags)
 * - p:embeddedFontLst (embedded fonts)
 * - p:custShowLst (custom shows)
 * - p:photoAlbum (photo album info)
 * - p:custDataLst (custom data)
 * - p:kinsoku (kinsoku settings)
 * - p:defaultTextStyle (default text style)
 * - p:modifyVerifier (modify verifier)
 * - p:extLst (extension list)
 *
 * @see ECMA-376 Part 1, Section 19.2.1.26
 */
export type PresentationElement = OoxmlElement<PresentationElementAttrs> & {
  /** Slide master ID list
   * @see ECMA-376 Part 1, Section 19.2.1.35 */
  "p:sldMasterIdLst"?: SlideMasterIdListElement;
  /** Notes master ID list
   * @see ECMA-376 Part 1, Section 19.2.1.22 */
  "p:notesMasterIdLst"?: NotesMasterIdListElement;
  /** Handout master ID list
   * @see ECMA-376 Part 1, Section 19.2.1.12 */
  "p:handoutMasterIdLst"?: HandoutMasterIdListElement;
  /** Slide ID list
   * @see ECMA-376 Part 1, Section 19.2.1.34 */
  "p:sldIdLst"?: SlideIdListElement;
  /** Slide size
   * @see ECMA-376 Part 1, Section 19.2.1.36 */
  "p:sldSz"?: SlideSizeElement;
  /** Notes size (REQUIRED)
   * @see ECMA-376 Part 1, Section 19.2.1.23 */
  "p:notesSz"?: NotesSizeElement;
  /** Smart tags */
  "p:smartTags"?: OoxmlElement;
  /** Embedded font list
   * @see ECMA-376 Part 1, Section 19.2.1.8 */
  "p:embeddedFontLst"?: EmbeddedFontListElement;
  /** Custom show list */
  "p:custShowLst"?: OoxmlElement;
  /** Photo album */
  "p:photoAlbum"?: OoxmlElement;
  /** Custom data list */
  "p:custDataLst"?: OoxmlElement;
  /** Kinsoku settings (East Asian line breaking rules) */
  "p:kinsoku"?: OoxmlElement;
  /** Default text style
   * @see ECMA-376 Part 1, Section 19.2.1.5 */
  "p:defaultTextStyle"?: ListStyleElement;
  /** Modify verifier */
  "p:modifyVerifier"?: OoxmlElement;
  /** Extension list */
  "p:extLst"?: OoxmlElement;
};

/**
 * Slide master ID list element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.35
 */
export type SlideMasterIdListElement = OoxmlElement & {
  /** Slide master ID entries */
  "p:sldMasterId"?: OoxmlChild<SlideMasterIdElement>;
};

/**
 * Slide master ID element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.33
 */
export type SlideMasterIdElement = OoxmlElement<{
  /** Relationship ID to slide master */
  "r:id"?: string;
  /** Master ID */
  id?: string;
}>;

/**
 * Notes master ID list element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.22
 */
export type NotesMasterIdListElement = OoxmlElement & {
  /** Notes master ID entries */
  "p:notesMasterId"?: OoxmlChild<NotesMasterIdElement>;
};

/**
 * Notes master ID element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.21
 */
export type NotesMasterIdElement = OoxmlElement<{
  /** Relationship ID to notes master */
  "r:id"?: string;
}>;

/**
 * Handout master ID list element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.12
 */
export type HandoutMasterIdListElement = OoxmlElement & {
  /** Handout master ID entries */
  "p:handoutMasterId"?: OoxmlChild<HandoutMasterIdElement>;
};

/**
 * Handout master ID element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.11
 */
export type HandoutMasterIdElement = OoxmlElement<{
  /** Relationship ID to handout master */
  "r:id"?: string;
}>;

/**
 * Slide ID list element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.34
 */
export type SlideIdListElement = OoxmlElement & {
  /** Slide ID entries */
  "p:sldId"?: OoxmlChild<SlideIdElement>;
};

/**
 * Slide ID element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.32
 */
export type SlideIdElement = OoxmlElement<{
  /** Relationship ID to slide */
  "r:id"?: string;
  /** Slide ID (must be >= 256) */
  id?: string;
}>;

/**
 * Slide size element attributes.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.36
 */
export type SlideSizeElementAttrs = {
  /** Width in EMU */
  cx?: string;
  /** Height in EMU */
  cy?: string;
  /** Slide size type */
  type?: string;
};

/**
 * Slide size element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.36
 */
export type SlideSizeElement = OoxmlElement<SlideSizeElementAttrs>;

/**
 * Notes size element.
 * Uses same dimensions as a:ext (cx/cy in EMU).
 *
 * @see ECMA-376 Part 1, Section 19.2.1.23
 */
export type NotesSizeElement = OoxmlElement<{
  /** Width in EMU */
  cx?: string;
  /** Height in EMU */
  cy?: string;
}>;

/**
 * Embedded font list element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.8
 */
export type EmbeddedFontListElement = OoxmlElement & {
  /** Embedded font entries */
  "p:embeddedFont"?: OoxmlChild<EmbeddedFontElement>;
};

/**
 * Embedded font element.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.7
 */
export type EmbeddedFontElement = OoxmlElement & {
  /** Font typeface */
  "p:font"?: OoxmlElement<{
    typeface?: string;
    panose?: string;
    pitchFamily?: string;
    charset?: string;
  }>;
  /** Regular font data */
  "p:regular"?: OoxmlElement<{ "r:id"?: string }>;
  /** Bold font data */
  "p:bold"?: OoxmlElement<{ "r:id"?: string }>;
  /** Italic font data */
  "p:italic"?: OoxmlElement<{ "r:id"?: string }>;
  /** Bold italic font data */
  "p:boldItalic"?: OoxmlElement<{ "r:id"?: string }>;
};

// =============================================================================
// Slide Structure
// =============================================================================

/**
 * Slide document element - wrapper for p:sld.
 * This represents the root of a parsed slide XML file.
 */
export type SlideDocumentElement = OoxmlElement & {
  "p:sld"?: SlideElement;
};

/**
 * Slide layout document element - wrapper for p:sldLayout.
 */
export type SlideLayoutDocumentElement = OoxmlElement & {
  "p:sldLayout"?: SlideLayoutElement;
};

/**
 * Slide master document element - wrapper for p:sldMaster.
 */
export type SlideMasterDocumentElement = OoxmlElement & {
  "p:sldMaster"?: SlideMasterElement;
};

/**
 * Union type for any slide content document.
 */
export type AnySlideDocumentElement =
  | SlideDocumentElement
  | SlideLayoutDocumentElement
  | SlideMasterDocumentElement;

/**
 * Slide element (p:sld) - root of slide content.
 */
export type SlideElement = OoxmlElement & {
  /** Common slide data */
  "p:cSld"?: CommonSlideDataElement;
  /** Color map override */
  "p:clrMapOvr"?: ColorMapOverrideElement;
  /** Transition */
  "p:transition"?: OoxmlElement;
  /** Timing - Animation/timing information
   * @see ECMA-376 Part 1, Section 19.5.87 */
  "p:timing"?: TimingElement;
};

/**
 * Common slide data element (p:cSld).
 */
export type CommonSlideDataElement = OoxmlElement & {
  /** Background */
  "p:bg"?: BackgroundElement;
  /** Shape tree */
  "p:spTree"?: ShapeTreeElement;
  /** Customer data */
  "p:custDataLst"?: OoxmlElement;
  /** Controls */
  "p:controls"?: OoxmlElement;
};

/**
 * Shape tree element (p:spTree) - container for all shapes on a slide.
 */
export type ShapeTreeElement = OoxmlElement & {
  /** Non-visual group properties */
  "p:nvGrpSpPr"?: NonVisualGroupShapePropertiesElement;
  /** Group shape properties */
  "p:grpSpPr"?: GroupShapePropertiesElement;
  /** Shapes */
  "p:sp"?: OoxmlChild<ShapeElement>;
  /** Connection shapes */
  "p:cxnSp"?: OoxmlChild<ConnectionShapeElement>;
  /** Pictures */
  "p:pic"?: OoxmlChild<PictureElement>;
  /** Graphic frames */
  "p:graphicFrame"?: OoxmlChild<GraphicFrameElement>;
  /** Group shapes */
  "p:grpSp"?: OoxmlChild<GroupShapeElement>;
  /** Alternate content (for compatibility fallbacks) */
  "mc:AlternateContent"?: OoxmlChild<AlternateContentElement>;
};

/**
 * Background element.
 */
export type BackgroundElement = OoxmlElement & {
  /** Background properties */
  "p:bgPr"?: BackgroundPropertiesElement;
  /** Background reference */
  "p:bgRef"?: StyleReferenceElement;
};

/**
 * Background properties element.
 */
export type BackgroundPropertiesElement = OoxmlElement & FillElements;

/**
 * Color map override element.
 */
export type ColorMapOverrideElement = OoxmlElement & {
  /** Master color mapping */
  "a:masterClrMapping"?: OoxmlElement;
  /** Override color mapping */
  "a:overrideClrMapping"?: OoxmlElement;
};

/**
 * Markup Compatibility AlternateContent element.
 * Used for document versioning and compatibility fallbacks.
 */
export type AlternateContentElement = OoxmlElement & {
  /** Choice element (preferred content) */
  "mc:Choice"?: OoxmlElement;
  /** Fallback element (compatibility content) */
  "mc:Fallback"?: GroupShapeElement;
};

// =============================================================================
// Slide Layout and Master
// =============================================================================

/**
 * Slide layout element (p:sldLayout).
 */
export type SlideLayoutElement = OoxmlElement & {
  "p:cSld"?: CommonSlideDataElement;
  "p:clrMapOvr"?: ColorMapOverrideElement;
};

/**
 * Slide master element (p:sldMaster).
 */
export type SlideMasterElement = OoxmlElement & {
  "p:cSld"?: CommonSlideDataElement;
  "p:clrMap"?: ColorMapElement;
  /** Text styles */
  "p:txStyles"?: TextStylesElement;
};

/**
 * Color map element.
 */
export type ColorMapAttrs = {
  bg1?: string;
  tx1?: string;
  bg2?: string;
  tx2?: string;
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
  accent5?: string;
  accent6?: string;
  hlink?: string;
  folHlink?: string;
};

export type ColorMapElement = OoxmlElement<ColorMapAttrs>;

/**
 * Text styles element.
 */
export type TextStylesElement = OoxmlElement & {
  /** Title style */
  "p:titleStyle"?: ListStyleElement;
  /** Body style */
  "p:bodyStyle"?: ListStyleElement;
  /** Other style */
  "p:otherStyle"?: ListStyleElement;
};

// =============================================================================
// Animation/Timing Elements (ECMA-376 Section 19.5)
// =============================================================================

/**
 * Timing element (p:timing) - Root element for slide animations.
 * @see ECMA-376 Part 1, Section 19.5.87
 */
export type TimingElement = OoxmlElement & {
  /** Time Node List */
  "p:tnLst"?: TimeNodeListElement;
  /** Build List */
  "p:bldLst"?: BuildListElement;
  /** Extension List */
  "p:extLst"?: OoxmlElement;
};

/**
 * Time Node List element (p:tnLst).
 * @see ECMA-376 Part 1, Section 19.5.87
 */
export type TimeNodeListElement = OoxmlElement & {
  /** Parallel time nodes */
  "p:par"?: OoxmlChild<ParallelTimeNodeElement>;
};

/**
 * Build List element (p:bldLst).
 * @see ECMA-376 Part 1, Section 19.5.8
 */
export type BuildListElement = OoxmlElement & {
  /** Build paragraph entries */
  "p:bldP"?: OoxmlChild<BuildParagraphElement>;
  /** Build diagram entries */
  "p:bldDgm"?: OoxmlChild<OoxmlElement>;
  /** Build ole chart entries */
  "p:bldOleChart"?: OoxmlChild<OoxmlElement>;
  /** Build graphic entries */
  "p:bldGraphic"?: OoxmlChild<OoxmlElement>;
};

/**
 * Build Paragraph element (p:bldP).
 * @see ECMA-376 Part 1, Section 19.5.12
 */
export type BuildParagraphAttrs = {
  /** Shape ID */
  spid?: string;
  /** Group ID */
  grpId?: string;
  /** Build type */
  build?: string;
  /** Build level */
  bldLvl?: string;
  /** Animate background */
  animBg?: string;
  /** Auto update animation background */
  autoUpdateAnimBg?: string;
  /** Reverse */
  rev?: string;
  /** Advance auto */
  advAuto?: string;
};

export type BuildParagraphElement = OoxmlElement<BuildParagraphAttrs>;

/**
 * Parallel Time Node element (p:par).
 * @see ECMA-376 Part 1, Section 19.5.53
 */
export type ParallelTimeNodeElement = OoxmlElement & {
  /** Common time node */
  "p:cTn"?: CommonTimeNodeElement;
};

/**
 * Sequence Time Node element (p:seq).
 * @see ECMA-376 Part 1, Section 19.5.65
 */
export type SequenceTimeNodeAttrs = {
  /** Concurrent */
  concurrent?: string;
  /** Next action */
  nextAc?: string;
  /** Previous action */
  prevAc?: string;
};

export type SequenceTimeNodeElement = OoxmlElement<SequenceTimeNodeAttrs> & {
  /** Common time node */
  "p:cTn"?: CommonTimeNodeElement;
  /** Previous condition list */
  "p:prevCondLst"?: ConditionListElement;
  /** Next condition list */
  "p:nextCondLst"?: ConditionListElement;
};

/**
 * Common Time Node element (p:cTn).
 * @see ECMA-376 Part 1, Section 19.5.33
 */
export type CommonTimeNodeAttrs = {
  /** Time node ID */
  id?: string;
  /** Duration - "indefinite" or milliseconds */
  dur?: string;
  /** Restart behavior - "always" | "whenNotActive" | "never" */
  restart?: string;
  /** Node type */
  nodeType?: string;
  /** Fill behavior - "hold" | "transition" | "freeze" | "remove" */
  fill?: string;
  /** Sync behavior - "canSlip" | "locked" */
  syncBehavior?: string;
  /** Preset animation ID */
  presetID?: string;
  /** Preset class - "entr" | "exit" | "emph" | "path" | "verb" | "mediacall" */
  presetClass?: string;
  /** Preset subtype */
  presetSubtype?: string;
  /** Group ID */
  grpId?: string;
  /** After effect */
  afterEffect?: string;
  /** Acceleration (0-100000) */
  accel?: string;
  /** Deceleration (0-100000) */
  decel?: string;
  /** Auto reverse */
  autoRev?: string;
  /** Repeat count */
  repeatCount?: string;
  /** Repeat duration */
  repeatDur?: string;
  /** Speed percentage */
  spd?: string;
  /** Master relation */
  masterRel?: string;
  /** Build level */
  bldLvl?: string;
  /** Event filter */
  evtFilter?: string;
  /** Display */
  display?: string;
};

export type CommonTimeNodeElement = OoxmlElement<CommonTimeNodeAttrs> & {
  /** Start condition list */
  "p:stCondLst"?: ConditionListElement;
  /** End condition list */
  "p:endCondLst"?: ConditionListElement;
  /** End sync */
  "p:endSync"?: OoxmlElement;
  /** Iterate */
  "p:iterate"?: OoxmlElement;
  /** Child time node list */
  "p:childTnLst"?: ChildTimeNodeListElement;
  /** Sub time node list */
  "p:subTnLst"?: OoxmlElement;
};

/**
 * Child Time Node List element (p:childTnLst).
 * @see ECMA-376 Part 1, Section 19.5.23
 */
export type ChildTimeNodeListElement = OoxmlElement & {
  /** Parallel time nodes */
  "p:par"?: OoxmlChild<ParallelTimeNodeElement>;
  /** Sequence time nodes */
  "p:seq"?: OoxmlChild<SequenceTimeNodeElement>;
  /** Exclusive time nodes */
  "p:excl"?: OoxmlChild<OoxmlElement>;
  /** Animate elements */
  "p:anim"?: OoxmlChild<AnimateElement>;
  /** Animate color elements */
  "p:animClr"?: OoxmlChild<OoxmlElement>;
  /** Animate effect elements */
  "p:animEffect"?: OoxmlChild<AnimateEffectElement>;
  /** Animate motion elements */
  "p:animMotion"?: OoxmlChild<AnimateMotionElement>;
  /** Animate rotation elements */
  "p:animRot"?: OoxmlChild<OoxmlElement>;
  /** Animate scale elements */
  "p:animScale"?: OoxmlChild<OoxmlElement>;
  /** Set elements */
  "p:set"?: OoxmlChild<SetElement>;
  /** Audio elements */
  "p:audio"?: OoxmlChild<OoxmlElement>;
  /** Video elements */
  "p:video"?: OoxmlChild<OoxmlElement>;
  /** Command elements */
  "p:cmd"?: OoxmlChild<OoxmlElement>;
};

/**
 * Condition List element (p:stCondLst, p:endCondLst).
 * @see ECMA-376 Part 1, Section 19.5.72
 */
export type ConditionListElement = OoxmlElement & {
  /** Conditions */
  "p:cond"?: OoxmlChild<ConditionElement>;
};

/**
 * Condition element (p:cond).
 * @see ECMA-376 Part 1, Section 19.5.25
 */
export type ConditionAttrs = {
  /** Delay - "indefinite" or milliseconds */
  delay?: string;
  /** Event - "onBegin" | "onEnd" | "onClick" | "onNext" | "onPrev" | etc */
  evt?: string;
};

export type ConditionElement = OoxmlElement<ConditionAttrs> & {
  /** Target element */
  "p:tgtEl"?: TargetElementElement;
  /** Time node reference */
  "p:tn"?: TimeNodeReferenceElement;
  /** Runtime node reference */
  "p:rtn"?: OoxmlElement;
};

/**
 * Target Element element (p:tgtEl).
 * @see ECMA-376 Part 1, Section 19.5.81
 */
export type TargetElementElement = OoxmlElement & {
  /** Shape target */
  "p:spTgt"?: ShapeTargetElement;
  /** Sound target */
  "p:sndTgt"?: OoxmlElement;
  /** Ink target */
  "p:inkTgt"?: OoxmlElement;
  /** Slide target */
  "p:sldTgt"?: OoxmlElement;
};

/**
 * Shape Target element (p:spTgt).
 * @see ECMA-376 Part 1, Section 19.5.70
 */
export type ShapeTargetAttrs = {
  /** Shape ID */
  spid?: string;
};

export type ShapeTargetElement = OoxmlElement<ShapeTargetAttrs> & {
  /** Background */
  "p:bg"?: OoxmlElement;
  /** Text element */
  "p:txEl"?: TextElementTargetElement;
  /** Graphic element */
  "p:graphicEl"?: OoxmlElement;
  /** Ole chart element */
  "p:oleChartEl"?: OoxmlElement;
  /** Sub shape */
  "p:subSp"?: OoxmlElement;
};

/**
 * Text Element Target (p:txEl).
 * @see ECMA-376 Part 1, Section 19.5.91
 */
export type TextElementTargetElement = OoxmlElement & {
  /** Character range */
  "p:charRg"?: CharacterRangeElement;
  /** Paragraph range */
  "p:pRg"?: ParagraphRangeElement;
};

/**
 * Character Range element (p:charRg).
 */
export type CharacterRangeAttrs = {
  /** Start index */
  st?: string;
  /** End index */
  end?: string;
};

export type CharacterRangeElement = OoxmlElement<CharacterRangeAttrs>;

/**
 * Paragraph Range element (p:pRg).
 */
export type ParagraphRangeAttrs = {
  /** Start index */
  st?: string;
  /** End index */
  end?: string;
};

export type ParagraphRangeElement = OoxmlElement<ParagraphRangeAttrs>;

/**
 * Time Node Reference element (p:tn).
 */
export type TimeNodeReferenceAttrs = {
  /** Time node ID */
  val?: string;
};

export type TimeNodeReferenceElement = OoxmlElement<TimeNodeReferenceAttrs>;

/**
 * Common Behavior element (p:cBhvr).
 * @see ECMA-376 Part 1, Section 19.5.22
 */
export type CommonBehaviorAttrs = {
  /** Additive mode - "base" | "sum" | "repl" | "mult" | "none" */
  additive?: string;
  /** Accumulate mode */
  accumulate?: string;
  /** Transform type */
  xfrmType?: string;
  /** From value */
  from?: string;
  /** To value */
  to?: string;
  /** By value */
  by?: string;
  /** Runtime context */
  rctx?: string;
  /** Override mode */
  override?: string;
};

export type CommonBehaviorElement = OoxmlElement<CommonBehaviorAttrs> & {
  /** Common time node */
  "p:cTn"?: CommonTimeNodeElement;
  /** Target element */
  "p:tgtEl"?: TargetElementElement;
  /** Attribute name list */
  "p:attrNameLst"?: AttributeNameListElement;
};

/**
 * Attribute Name List element (p:attrNameLst).
 * @see ECMA-376 Part 1, Section 19.5.10
 */
export type AttributeNameListElement = OoxmlElement & {
  /** Attribute names */
  "p:attrName"?: OoxmlChild<string>;
};

/**
 * Animate element (p:anim).
 * @see ECMA-376 Part 1, Section 19.5.1
 */
export type AnimateAttrs = {
  /** By value */
  by?: string;
  /** From value */
  from?: string;
  /** To value */
  to?: string;
  /** Calculation mode - "discrete" | "lin" | "fmla" */
  calcmode?: string;
  /** Value type - "str" | "num" | "clr" */
  valueType?: string;
};

export type AnimateElement = OoxmlElement<AnimateAttrs> & {
  /** Common behavior */
  "p:cBhvr"?: CommonBehaviorElement;
  /** Time animate value list (keyframes) */
  "p:tavLst"?: TimeAnimateValueListElement;
};

/**
 * Time Animate Value List element (p:tavLst) - Keyframes container.
 * @see ECMA-376 Part 1, Section 19.5.79
 */
export type TimeAnimateValueListElement = OoxmlElement & {
  /** Time animate values (keyframes) */
  "p:tav"?: OoxmlChild<TimeAnimateValueElement>;
};

/**
 * Time Animate Value element (p:tav) - Single keyframe.
 * @see ECMA-376 Part 1, Section 19.5.78
 */
export type TimeAnimateValueAttrs = {
  /** Time percentage (0-100000, where 100000 = 100%) */
  tm?: string;
  /** Formula */
  fmla?: string;
};

export type TimeAnimateValueElement = OoxmlElement<TimeAnimateValueAttrs> & {
  /** Value */
  "p:val"?: AnimateValueElement;
};

/**
 * Animate Value element (p:val).
 */
export type AnimateValueElement = OoxmlElement & {
  /** String value */
  "p:strVal"?: StringValueElement;
  /** Boolean value */
  "p:boolVal"?: BooleanValueElement;
  /** Integer value */
  "p:intVal"?: IntegerValueElement;
  /** Float value */
  "p:fltVal"?: FloatValueElement;
  /** Color value */
  "p:clrVal"?: OoxmlElement;
};

/**
 * String Value element (p:strVal).
 */
export type StringValueAttrs = {
  /** Value */
  val?: string;
};

export type StringValueElement = OoxmlElement<StringValueAttrs>;

/**
 * Boolean Value element (p:boolVal).
 */
export type BooleanValueAttrs = {
  /** Value */
  val?: string;
};

export type BooleanValueElement = OoxmlElement<BooleanValueAttrs>;

/**
 * Integer Value element (p:intVal).
 */
export type IntegerValueAttrs = {
  /** Value */
  val?: string;
};

export type IntegerValueElement = OoxmlElement<IntegerValueAttrs>;

/**
 * Float Value element (p:fltVal).
 */
export type FloatValueAttrs = {
  /** Value */
  val?: string;
};

export type FloatValueElement = OoxmlElement<FloatValueAttrs>;

/**
 * Set element (p:set) - Instant property change.
 * @see ECMA-376 Part 1, Section 19.5.66
 */
export type SetElement = OoxmlElement & {
  /** Common behavior */
  "p:cBhvr"?: CommonBehaviorElement;
  /** To value */
  "p:to"?: AnimateValueElement;
};

/**
 * Animate Effect element (p:animEffect).
 * @see ECMA-376 Part 1, Section 19.5.3
 */
export type AnimateEffectAttrs = {
  /** Transition - "in" | "out" | "none" */
  transition?: string;
  /** Filter - effect filter string */
  filter?: string;
  /** Printer time */
  prLst?: string;
};

export type AnimateEffectElement = OoxmlElement<AnimateEffectAttrs> & {
  /** Common behavior */
  "p:cBhvr"?: CommonBehaviorElement;
  /** Progress */
  "p:progress"?: OoxmlElement;
};

/**
 * Animate Motion element (p:animMotion).
 * @see ECMA-376 Part 1, Section 19.5.4
 */
export type AnimateMotionAttrs = {
  /** Origin - "parent" | "layout" */
  origin?: string;
  /** Path */
  path?: string;
  /** Path edit mode */
  pathEditMode?: string;
  /** Relative angle */
  rAng?: string;
  /** Points types */
  ptsTypes?: string;
};

export type AnimateMotionElement = OoxmlElement<AnimateMotionAttrs> & {
  /** Common behavior */
  "p:cBhvr"?: CommonBehaviorElement;
  /** By */
  "p:by"?: OoxmlElement;
  /** From */
  "p:from"?: OoxmlElement;
  /** To */
  "p:to"?: OoxmlElement;
  /** Rotation center */
  "p:rCtr"?: OoxmlElement;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get blipFill from a picture element, handling mc:AlternateContent fallback.
 *
 * Some PPTX files (especially those created/edited on Mac) use mc:AlternateContent
 * to provide different image formats (e.g., PDF for Mac, PNG as fallback).
 * This function checks for direct p:blipFill first, then falls back to
 * mc:AlternateContent/mc:Fallback/p:blipFill.
 */
export function getBlipFillFromPic(node: PictureElement | XmlElement): BlipFillElement | undefined {
  // Handle XmlElement format (new AST)
  if (isXmlElementNode(node)) {
    // Try direct p:blipFill first
    const blipFillElement = getChild(node, "p:blipFill");
    if (blipFillElement !== undefined) {
      return xmlToBlipFill(blipFillElement);
    }

    // Try mc:AlternateContent fallback
    const mcElement = getChild(node, "mc:AlternateContent");
    if (mcElement !== undefined) {
      const fallbackElement = getChild(mcElement, "mc:Fallback");
      if (fallbackElement !== undefined) {
        const fallbackBlipFill = getChild(fallbackElement, "p:blipFill");
        if (fallbackBlipFill !== undefined) {
          return xmlToBlipFill(fallbackBlipFill);
        }
      }
    }

    return undefined;
  }

  // Handle OoxmlElement format (legacy)
  const legacyNode = node as PictureElement;

  // Try direct p:blipFill first
  const directBlipFill = legacyNode["p:blipFill"];
  if (directBlipFill !== undefined) {
    return directBlipFill;
  }

  // Try mc:AlternateContent fallback
  const mcNode = legacyNode["mc:AlternateContent"];
  if (mcNode === undefined) {
    return undefined;
  }

  // Get p:blipFill from mc:Fallback
  const fallbackNode = mcNode["mc:Fallback"];
  if (fallbackNode !== undefined) {
    return fallbackNode["p:blipFill"];
  }

  return undefined;
}

/**
 * Check if a value is an XmlElement (has type="element")
 */
function isXmlElementNode(value: unknown): value is XmlElement {
  if (value === null || value === undefined) { return false; }
  if (typeof value !== "object") { return false; }
  if (!("type" in value)) { return false; }
  return (value as { type: unknown }).type === "element";
}

/**
 * Convert XmlElement to BlipFillElement format
 */
function xmlToBlipFill(element: XmlElement): BlipFillElement {
  const result: Record<string, unknown> = {
    attrs: element.attrs,
  };

  for (const child of element.children) {
    if (isXmlElement(child)) {
      result[child.name] = xmlToBlipFill(child);
    }
  }

  return result as BlipFillElement;
}
