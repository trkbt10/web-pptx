/**
 * @file ECMA-376 Compliant Type System for OOXML
 *
 * This module provides a type system that bridges XmlElement (parser output)
 * with OOXML element types as defined by ECMA-376.
 *
 * Design principles:
 * 1. XmlElement is the runtime representation - all OOXML types extend it
 * 2. Element names are branded types for compile-time safety
 * 3. Type guards validate structure at runtime
 * 4. Child access is always through validated accessors
 *
 * @see ECMA-376 Part 1, Section 19.3 - PresentationML
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

import type { XmlElement } from "../../xml";
import { isXmlElement, getChild, getChildren, getAttr, getTextContent } from "../../xml";

// =============================================================================
// Core Type System
// =============================================================================

/**
 * Branded type for element names.
 * This ensures compile-time checking that element names match expected values.
 */
declare const ElementNameBrand: unique symbol;

/**
 * A typed XML element with a specific element name.
 * This is the foundation of the ECMA-376 compliant type system.
 *
 * TName: The expected element name (e.g., "p:sp", "a:r")
 * TAttrs: Expected attributes type
 */
export type TypedXmlElement<
  TName extends string,
  TAttrs extends Record<string, string | undefined> = Record<string, string | undefined>,
> = XmlElement & {
  readonly name: TName;
  readonly attrs: Readonly<TAttrs>;
  readonly [ElementNameBrand]: TName;
};

/**
 * Result type for child element access.
 * Wraps the result with provenance information.
 */
export type ChildResult<T extends XmlElement> = {
  readonly element: T;
  readonly parent: XmlElement;
  readonly childName: string;
};

// =============================================================================
// Element Name Constants (ECMA-376 Namespace Prefixes)
// =============================================================================

/**
 * PresentationML namespace prefix (ECMA-376 Part 1, Section 19.3)
 */
export const NS_P = "p:" as const;

/**
 * DrawingML namespace prefix (ECMA-376 Part 1, Section 20.1)
 */
export const NS_A = "a:" as const;

/**
 * Chart namespace prefix (ECMA-376 Part 1, Section 21.2)
 */
export const NS_C = "c:" as const;

/**
 * Markup Compatibility namespace prefix
 */
export const NS_MC = "mc:" as const;

// =============================================================================
// Validated Element Accessor
// =============================================================================

/**
 * Type guard factory for creating element-specific type guards.
 *
 * @param expectedName - The expected element name (e.g., "p:sp")
 * @param validateStructure - Optional function to validate element structure
 * @returns Type guard function
 */
export function createElementGuard<
  TName extends string,
  TAttrs extends Record<string, string | undefined> = Record<string, string | undefined>,
>(
  expectedName: TName,
  validateStructure?: (element: XmlElement) => boolean,
): (node: unknown) => node is TypedXmlElement<TName, TAttrs> {
  return (node: unknown): node is TypedXmlElement<TName, TAttrs> => {
    if (!isXmlElement(node)) {
      return false;
    }
    if (node.name !== expectedName) {
      return false;
    }
    if (validateStructure !== undefined) {
      return validateStructure(node);
    }
    return true;
  };
}

/**
 * Get a typed child element with validation.
 * This is the safe way to access child elements.
 *
 * @param parent - Parent element
 * @param childName - Name of child element to find
 * @param guard - Type guard to validate the child
 * @returns Typed child element or undefined
 */
export function getTypedChildElement<T extends XmlElement>(
  parent: XmlElement | undefined,
  childName: string,
  guard: (node: unknown) => node is T,
): T | undefined {
  if (parent === undefined) {
    return undefined;
  }
  const child = getChild(parent, childName);
  if (child === undefined) {
    return undefined;
  }
  if (!guard(child)) {
    return undefined;
  }
  return child;
}

/**
 * Get all typed children with validation.
 *
 * @param parent - Parent element
 * @param childName - Name of child elements to find
 * @param guard - Type guard to validate each child
 * @returns Array of validated typed children
 */
export function getTypedChildren<T extends XmlElement>(
  parent: XmlElement | undefined,
  childName: string,
  guard: (node: unknown) => node is T,
): readonly T[] {
  if (parent === undefined) {
    return [];
  }
  const children = getChildren(parent, childName);
  const result: T[] = [];
  for (const child of children) {
    if (guard(child)) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Get typed attribute value with type conversion.
 *
 * @param element - Element to get attribute from
 * @param attrName - Name of attribute
 * @returns Attribute value or undefined
 */
export function getTypedAttr(
  element: XmlElement | undefined,
  attrName: string,
): string | undefined {
  if (element === undefined) {
    return undefined;
  }
  return getAttr(element, attrName);
}

/**
 * Get numeric attribute value.
 *
 * @param element - Element to get attribute from
 * @param attrName - Name of attribute
 * @returns Numeric value or undefined
 */
export function getNumericAttr(
  element: XmlElement | undefined,
  attrName: string,
): number | undefined {
  const value = getTypedAttr(element, attrName);
  if (value === undefined) {
    return undefined;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return undefined;
  }
  return num;
}

/**
 * Get boolean attribute value.
 * OOXML uses "1" or "true" for true, "0" or "false" for false.
 *
 * @param element - Element to get attribute from
 * @param attrName - Name of attribute
 * @returns Boolean value or undefined
 */
export function getBooleanAttr(
  element: XmlElement | undefined,
  attrName: string,
): boolean | undefined {
  const value = getTypedAttr(element, attrName);
  if (value === undefined) {
    return undefined;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

// =============================================================================
// PresentationML Element Types (ECMA-376 Part 1, Section 19.3)
// =============================================================================

/**
 * p:sp - Shape Element
 * @see ECMA-376 Part 1, 19.3.1.43
 */
export type PSpElement = TypedXmlElement<"p:sp">;

/**
 * p:pic - Picture Element
 * @see ECMA-376 Part 1, 19.3.1.37
 */
export type PPicElement = TypedXmlElement<"p:pic">;

/**
 * p:grpSp - Group Shape Element
 * @see ECMA-376 Part 1, 19.3.1.22
 */
export type PGrpSpElement = TypedXmlElement<"p:grpSp">;

/**
 * p:graphicFrame - Graphic Frame Element
 * @see ECMA-376 Part 1, 19.3.1.21
 */
export type PGraphicFrameElement = TypedXmlElement<"p:graphicFrame">;

/**
 * p:cxnSp - Connection Shape Element
 * @see ECMA-376 Part 1, 19.3.1.19
 */
export type PCxnSpElement = TypedXmlElement<"p:cxnSp">;

/**
 * p:spPr - Shape Properties Element
 * @see ECMA-376 Part 1, 19.3.1.44
 */
export type PSpPrElement = TypedXmlElement<"p:spPr">;

/**
 * Elements that can contain p:spPr (Shape Properties).
 * According to ECMA-376, these element types all have p:spPr as a child:
 * - p:sp (Shape)
 * - p:pic (Picture)
 * - p:cxnSp (Connection Shape)
 *
 * @see ECMA-376 Part 1, Sections 19.3.1.43, 19.3.1.37, 19.3.1.19
 */
export type PShapePropertiesContainer = PSpElement | PPicElement | PCxnSpElement;

/**
 * p:txBody - Text Body Element in PresentationML
 * @see ECMA-376 Part 1, 19.3.1.51
 */
export type PTxBodyElement = TypedXmlElement<"p:txBody">;

/**
 * p:nvSpPr - Non-Visual Shape Properties
 * @see ECMA-376 Part 1, 19.3.1.34
 */
export type PNvSpPrElement = TypedXmlElement<"p:nvSpPr">;

/**
 * p:nvPicPr - Non-Visual Picture Properties
 * @see ECMA-376 Part 1, 19.3.1.32
 */
export type PNvPicPrElement = TypedXmlElement<"p:nvPicPr">;

/**
 * p:nvGrpSpPr - Non-Visual Group Shape Properties
 * @see ECMA-376 Part 1, 19.3.1.31
 */
export type PNvGrpSpPrElement = TypedXmlElement<"p:nvGrpSpPr">;

/**
 * p:nvGraphicFramePr - Non-Visual Graphic Frame Properties
 * @see ECMA-376 Part 1, 19.3.1.30
 */
export type PNvGraphicFramePrElement = TypedXmlElement<"p:nvGraphicFramePr">;

/**
 * p:nvCxnSpPr - Non-Visual Connection Shape Properties
 * @see ECMA-376 Part 1, 19.3.1.29
 */
export type PNvCxnSpPrElement = TypedXmlElement<"p:nvCxnSpPr">;

/**
 * p:grpSpPr - Group Shape Properties
 * @see ECMA-376 Part 1, 19.3.1.23
 */
export type PGrpSpPrElement = TypedXmlElement<"p:grpSpPr">;

/**
 * p:blipFill - Blip Fill (Picture Fill)
 * @see ECMA-376 Part 1, 19.3.1.4
 */
export type PBlipFillElement = TypedXmlElement<"p:blipFill">;

/**
 * p:sld - Slide Element
 * @see ECMA-376 Part 1, 19.3.1.38
 */
export type PSldElement = TypedXmlElement<"p:sld">;

/**
 * p:cSld - Common Slide Data Element
 * @see ECMA-376 Part 1, 19.3.1.16
 */
export type PCSldElement = TypedXmlElement<"p:cSld">;

/**
 * p:spTree - Shape Tree Element
 * @see ECMA-376 Part 1, 19.3.1.45
 */
export type PSpTreeElement = TypedXmlElement<"p:spTree">;

/**
 * p:xfrm - Transform Element (PresentationML)
 * @see ECMA-376 Part 1, 19.3.1.53
 */
export type PXfrmElement = TypedXmlElement<"p:xfrm", {
  /** Rotation in 60000ths of a degree */
  rot?: string;
  /** Flip horizontal */
  flipH?: string;
  /** Flip vertical */
  flipV?: string;
}>;

// =============================================================================
// DrawingML Element Types (ECMA-376 Part 1, Section 20.1)
// =============================================================================

/**
 * a:p - Paragraph Element
 * @see ECMA-376 Part 1, 21.1.2.2.6
 */
export type APElement = TypedXmlElement<"a:p">;

/**
 * a:r - Text Run Element
 * @see ECMA-376 Part 1, 21.1.2.3.8
 */
export type ARElement = TypedXmlElement<"a:r">;

/**
 * a:t - Text Element
 * @see ECMA-376 Part 1, 21.1.2.3.12
 */
export type ATElement = TypedXmlElement<"a:t">;

/**
 * a:rPr - Run Properties Element
 * @see ECMA-376 Part 1, 21.1.2.3.9
 */
export type ARPrElement = TypedXmlElement<"a:rPr", {
  /** Language */
  lang?: string;
  /** Font size in 1/100 pt */
  sz?: string;
  /** Bold */
  b?: string;
  /** Italic */
  i?: string;
  /** Underline */
  u?: string;
  /** Strikethrough */
  strike?: string;
  /** Spacing in 1/1000 em */
  spc?: string;
  /** Capitalization (small, all, none) */
  cap?: string;
  /** Baseline offset */
  baseline?: string;
}>;

/**
 * a:fld - Text Field Element
 * @see ECMA-376 Part 1, 21.1.2.2.2
 */
export type AFldElement = TypedXmlElement<"a:fld", {
  /** Field type (e.g., datetime, slidenum) */
  type?: string;
  /** Field identifier */
  uuid?: string;
}>;

/**
 * a:br - Line Break Element
 * @see ECMA-376 Part 1, 21.1.2.2.1
 */
export type ABrElement = TypedXmlElement<"a:br">;

/**
 * a:hlinkClick - Hyperlink Click Element
 * @see ECMA-376 Part 1, 21.1.2.3.5
 */
export type AHlinkClickElement = TypedXmlElement<"a:hlinkClick", {
  /** Relationship ID to target */
  "r:id"?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Action (e.g., ppaction://hlinkpres?slidenum=3) */
  action?: string;
}>;

/**
 * a:highlight - Highlight Color Element
 * @see ECMA-376 Part 1, 21.1.2.3.4
 */
export type AHighlightElement = TypedXmlElement<"a:highlight">;

/**
 * a:pPr - Paragraph Properties Element
 * @see ECMA-376 Part 1, 21.1.2.2.7
 */
export type APPrElement = TypedXmlElement<"a:pPr", {
  /** Alignment (l, ctr, r, just, dist, thaiDist, justLow) */
  algn?: string;
  /** Level (0-8) */
  lvl?: string;
  /** Right-to-left */
  rtl?: string;
  /** Left margin in EMU */
  marL?: string;
  /** Right margin in EMU */
  marR?: string;
  /** First line indent in EMU */
  indent?: string;
}>;

/**
 * a:buChar - Bullet Character Element
 * @see ECMA-376 Part 1, 21.1.2.3.2
 */
export type ABuCharElement = TypedXmlElement<"a:buChar", {
  /** Bullet character */
  char?: string;
}>;

/**
 * a:buAutoNum - Bullet Auto Number Element
 * @see ECMA-376 Part 1, 21.1.2.3.1
 */
export type ABuAutoNumElement = TypedXmlElement<"a:buAutoNum", {
  /** Number format type (arabicPeriod, romanLcPeriod, etc.) */
  type?: string;
  /** Start number */
  startAt?: string;
}>;

/**
 * a:buNone - No Bullet Element
 * @see ECMA-376 Part 1, 21.1.2.3.3
 */
export type ABuNoneElement = TypedXmlElement<"a:buNone">;

/**
 * a:txBody - Text Body Element in DrawingML
 * @see ECMA-376 Part 1, 21.1.2.1.1
 */
export type ATxBodyElement = TypedXmlElement<"a:txBody">;

/**
 * a:bodyPr - Body Properties Element
 * Defines text body properties including insets, anchor, and wrap mode.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2
 */
export type ABodyPrElement = TypedXmlElement<"a:bodyPr", {
  /** Left inset in EMU */
  lIns?: string;
  /** Right inset in EMU */
  rIns?: string;
  /** Top inset in EMU */
  tIns?: string;
  /** Bottom inset in EMU */
  bIns?: string;
  /** Vertical anchor: t (top), ctr (center), b (bottom) */
  anchor?: string;
  /** Wrap mode: square, none */
  wrap?: string;
  /** Right-to-left columns */
  rtlCol?: string;
  /** Anchor centered */
  anchorCtr?: string;
  /** Vertical text type */
  vert?: string;
  /** Rotation angle in 1/60000 degrees */
  rot?: string;
}>;

/**
 * a:lstStyle - List Style Element
 * @see ECMA-376 Part 1, 21.1.2.4.12
 */
export type ALstStyleElement = TypedXmlElement<"a:lstStyle">;

/**
 * a:xfrm - 2D Transform Element
 * @see ECMA-376 Part 1, 20.1.7.5
 */
export type AXfrmElement = TypedXmlElement<"a:xfrm">;

/**
 * a:off - Offset Element
 * @see ECMA-376 Part 1, 20.1.7.4
 */
export type AOffElement = TypedXmlElement<"a:off", { x: string; y: string }>;

/**
 * a:ext - Extent Element
 * @see ECMA-376 Part 1, 20.1.7.3
 */
export type AExtElement = TypedXmlElement<"a:ext", { cx: string; cy: string }>;

/**
 * a:ln - Line Properties Element
 * @see ECMA-376 Part 1, 20.1.2.2.24
 */
export type ALnElement = TypedXmlElement<"a:ln">;

/**
 * a:solidFill - Solid Fill Element
 * @see ECMA-376 Part 1, 20.1.8.54
 */
export type ASolidFillElement = TypedXmlElement<"a:solidFill">;

/**
 * a:gradFill - Gradient Fill Element
 * @see ECMA-376 Part 1, 20.1.8.33
 */
export type AGradFillElement = TypedXmlElement<"a:gradFill">;

/**
 * a:blip - Blip Element (image reference)
 * @see ECMA-376 Part 1, 20.1.8.13
 */
export type ABlipElement = TypedXmlElement<"a:blip", { "r:embed"?: string; "r:link"?: string }>;

/**
 * a:blipFill - Blip Fill Element
 * @see ECMA-376 Part 1, 20.1.8.14
 */
export type ABlipFillElement = TypedXmlElement<"a:blipFill">;

/**
 * a:prstGeom - Preset Geometry Element
 * @see ECMA-376 Part 1, 20.1.9.18
 */
export type APrstGeomElement = TypedXmlElement<"a:prstGeom", { prst?: string }>;

/**
 * a:custGeom - Custom Geometry Element
 * @see ECMA-376 Part 1, 20.1.9.8
 */
export type ACustGeomElement = TypedXmlElement<"a:custGeom">;

// =============================================================================
// Table Element Types (ECMA-376 Part 1, Section 21.1.3)
// =============================================================================

/**
 * a:tbl - Table Element
 * @see ECMA-376 Part 1, 21.1.3.13
 */
export type ATblElement = TypedXmlElement<"a:tbl">;

/**
 * a:tr - Table Row Element
 * @see ECMA-376 Part 1, 21.1.3.18
 */
export type ATrElement = TypedXmlElement<"a:tr", { h?: string }>;

/**
 * a:tc - Table Cell Element
 * @see ECMA-376 Part 1, 21.1.3.16
 */
export type ATcElement = TypedXmlElement<"a:tc", {
  rowSpan?: string;
  gridSpan?: string;
  hMerge?: string;
  vMerge?: string;
}>;

/**
 * a:tblGrid - Table Grid Element
 * @see ECMA-376 Part 1, 21.1.3.14
 */
export type ATblGridElement = TypedXmlElement<"a:tblGrid">;

/**
 * a:gridCol - Grid Column Element
 * @see ECMA-376 Part 1, 21.1.3.2
 */
export type AGridColElement = TypedXmlElement<"a:gridCol", { w?: string }>;

// =============================================================================
// Spacing Element Types
// =============================================================================

/**
 * a:lnSpc - Line Spacing Element
 * @see ECMA-376 Part 1, 21.1.2.2.5
 */
export type ALnSpcElement = TypedXmlElement<"a:lnSpc">;

/**
 * a:spcBef - Space Before Element
 * @see ECMA-376 Part 1, 21.1.2.2.9
 */
export type ASpcBefElement = TypedXmlElement<"a:spcBef">;

/**
 * a:spcAft - Space After Element
 * @see ECMA-376 Part 1, 21.1.2.2.8
 */
export type ASpcAftElement = TypedXmlElement<"a:spcAft">;

/**
 * a:spcPts - Spacing in Points
 * @see ECMA-376 Part 1, 21.1.2.2.10
 */
export type ASpcPtsElement = TypedXmlElement<"a:spcPts", { val: string }>;

/**
 * a:spcPct - Spacing as Percentage
 * @see ECMA-376 Part 1, 21.1.2.2.11
 */
export type ASpcPctElement = TypedXmlElement<"a:spcPct", { val: string }>;

// =============================================================================
// Alternate Content (Markup Compatibility)
// =============================================================================

/**
 * mc:AlternateContent - Alternate Content Element
 * @see ECMA-376 Part 3, 10.2.1
 */
export type McAlternateContentElement = TypedXmlElement<"mc:AlternateContent">;

/**
 * mc:Choice - Choice Element
 */
export type McChoiceElement = TypedXmlElement<"mc:Choice">;

/**
 * mc:Fallback - Fallback Element
 */
export type McFallbackElement = TypedXmlElement<"mc:Fallback">;

// =============================================================================
// Chart Element Types (ECMA-376 Part 1, Section 21.2)
// =============================================================================

/**
 * c:chartSpace - Chart Space Element (root of chart)
 * @see ECMA-376 Part 1, 21.2.2.29
 */
export type CChartSpaceElement = TypedXmlElement<"c:chartSpace">;

/**
 * c:chart - Chart Element
 * @see ECMA-376 Part 1, 21.2.2.27
 */
export type CChartElement = TypedXmlElement<"c:chart">;

/**
 * c:plotArea - Plot Area Element
 * @see ECMA-376 Part 1, 21.2.2.146
 */
export type CPlotAreaElement = TypedXmlElement<"c:plotArea">;

// =============================================================================
// Diagram Element Types (ECMA-376 Part 1, Section 21.4)
// =============================================================================

/**
 * dgm:relIds - Diagram Relationship IDs
 * @see ECMA-376 Part 1, 21.4.2.28
 */
export type DgmRelIdsElement = TypedXmlElement<"dgm:relIds", {
  "r:dm"?: string;
  "r:lo"?: string;
  "r:qs"?: string;
  "r:cs"?: string;
}>;

/**
 * a:graphic - Graphic Element
 * @see ECMA-376 Part 1, 20.1.2.2.16
 */
export type AGraphicElement = TypedXmlElement<"a:graphic">;

/**
 * a:graphicData - Graphic Data Element
 * @see ECMA-376 Part 1, 20.1.2.2.17
 */
export type AGraphicDataElement = TypedXmlElement<"a:graphicData", {
  uri?: string;
}>;

// =============================================================================
// Type Guards (ECMA-376 Structure Validation)
// =============================================================================

/**
 * Type guard for p:sp (Shape) element.
 * Validates that it has the required p:nvSpPr child.
 */
export const isPSp = createElementGuard<"p:sp">("p:sp", (el) => {
  return getChild(el, "p:nvSpPr") !== undefined;
});

/**
 * Type guard for p:pic (Picture) element.
 * Validates that it has the required p:nvPicPr child.
 */
export const isPPic = createElementGuard<"p:pic">("p:pic", (el) => {
  return getChild(el, "p:nvPicPr") !== undefined;
});

/**
 * Type guard for p:grpSp (Group Shape) element.
 * Validates that it has the required p:nvGrpSpPr child.
 */
export const isPGrpSp = createElementGuard<"p:grpSp">("p:grpSp", (el) => {
  return getChild(el, "p:nvGrpSpPr") !== undefined;
});

/**
 * Type guard for p:graphicFrame element.
 * Validates that it has the required p:nvGraphicFramePr child.
 */
export const isPGraphicFrame = createElementGuard<"p:graphicFrame">("p:graphicFrame", (el) => {
  return getChild(el, "p:nvGraphicFramePr") !== undefined;
});

/**
 * Type guard for p:cxnSp (Connection Shape) element.
 * Validates that it has the required p:nvCxnSpPr child.
 */
export const isPCxnSp = createElementGuard<"p:cxnSp">("p:cxnSp", (el) => {
  return getChild(el, "p:nvCxnSpPr") !== undefined;
});

/**
 * Type guard for p:spPr (Shape Properties) element.
 */
export const isPSpPr = createElementGuard<"p:spPr">("p:spPr");

/**
 * Type guard for p:txBody element.
 */
export const isPTxBody = createElementGuard<"p:txBody">("p:txBody");

/**
 * Type guard for p:grpSpPr element.
 */
export const isPGrpSpPr = createElementGuard<"p:grpSpPr">("p:grpSpPr");

/**
 * Type guard for p:blipFill element.
 */
export const isPBlipFill = createElementGuard<"p:blipFill">("p:blipFill");

/**
 * Type guard for a:p (Paragraph) element.
 */
export const isAP = createElementGuard<"a:p">("a:p");

/**
 * Type guard for a:r (Text Run) element.
 */
export const isAR = createElementGuard<"a:r">("a:r");

/**
 * Type guard for a:t (Text) element.
 */
export const isAT = createElementGuard<"a:t">("a:t");

/**
 * Type guard for a:rPr (Run Properties) element.
 */
export const isARPr = createElementGuard<"a:rPr">("a:rPr");

/**
 * Type guard for a:fld (Text Field) element.
 */
export const isAFld = createElementGuard<"a:fld">("a:fld");

/**
 * Type guard for a:br (Line Break) element.
 */
export const isABr = createElementGuard<"a:br">("a:br");

/**
 * Type guard for a:hlinkClick (Hyperlink) element.
 */
export const isAHlinkClick = createElementGuard<"a:hlinkClick">("a:hlinkClick");

/**
 * Type guard for a:highlight element.
 */
export const isAHighlight = createElementGuard<"a:highlight">("a:highlight");

/**
 * Type guard for a:pPr (Paragraph Properties) element.
 */
export const isAPPr = createElementGuard<"a:pPr">("a:pPr");

/**
 * Type guard for a:txBody element.
 */
export const isATxBody = createElementGuard<"a:txBody">("a:txBody");

/**
 * Type guard for a:bodyPr element.
 */
export const isABodyPr = createElementGuard<"a:bodyPr">("a:bodyPr");

/**
 * Type guard for a:lstStyle element.
 */
export const isALstStyle = createElementGuard<"a:lstStyle">("a:lstStyle");

/**
 * Type guard for a:xfrm element.
 * Validates that it has at least a:off or a:ext child.
 */
export const isAXfrm = createElementGuard<"a:xfrm">("a:xfrm", (el) => {
  if (getChild(el, "a:off") !== undefined) {
    return true;
  }
  return getChild(el, "a:ext") !== undefined;
});

/**
 * Type guard for a:off element.
 * Validates required x and y attributes.
 */
export const isAOff = createElementGuard<"a:off", { x: string; y: string }>("a:off", (el) => {
  return getAttr(el, "x") !== undefined;
});

/**
 * Type guard for a:ext element.
 * Validates required cx and cy attributes.
 */
export const isAExt = createElementGuard<"a:ext", { cx: string; cy: string }>("a:ext", (el) => {
  return getAttr(el, "cx") !== undefined;
});

/**
 * Type guard for a:ln element.
 */
export const isALn = createElementGuard<"a:ln">("a:ln");

/**
 * Type guard for a:solidFill element.
 */
export const isASolidFill = createElementGuard<"a:solidFill">("a:solidFill");

/**
 * Type guard for a:gradFill element.
 */
export const isAGradFill = createElementGuard<"a:gradFill">("a:gradFill");

/**
 * Type guard for a:blip element.
 */
export const isABlip = createElementGuard<"a:blip", { "r:embed"?: string; "r:link"?: string }>("a:blip");

/**
 * Type guard for a:blipFill element.
 */
export const isABlipFill = createElementGuard<"a:blipFill">("a:blipFill");

/**
 * Type guard for a:prstGeom element.
 */
export const isAPrstGeom = createElementGuard<"a:prstGeom">("a:prstGeom");

/**
 * Type guard for a:custGeom element.
 */
export const isACustGeom = createElementGuard<"a:custGeom">("a:custGeom");

/**
 * Type guard for a:tbl element.
 */
export const isATbl = createElementGuard<"a:tbl">("a:tbl");

/**
 * Type guard for a:tr element.
 */
export const isATr = createElementGuard<"a:tr">("a:tr");

/**
 * Type guard for a:tc element.
 */
export const isATc = createElementGuard<"a:tc">("a:tc");

/**
 * Type guard for a:tblGrid element.
 */
export const isATblGrid = createElementGuard<"a:tblGrid">("a:tblGrid");

/**
 * Type guard for a:gridCol element.
 */
export const isAGridCol = createElementGuard<"a:gridCol">("a:gridCol");

/**
 * Type guard for a:lnSpc element.
 */
export const isALnSpc = createElementGuard<"a:lnSpc">("a:lnSpc");

/**
 * Type guard for a:spcBef element.
 */
export const isASpcBef = createElementGuard<"a:spcBef">("a:spcBef");

/**
 * Type guard for a:spcAft element.
 */
export const isASpcAft = createElementGuard<"a:spcAft">("a:spcAft");

/**
 * Type guard for a:spcPts element.
 */
export const isASpcPts = createElementGuard<"a:spcPts">("a:spcPts");

/**
 * Type guard for a:spcPct element.
 */
export const isASpcPct = createElementGuard<"a:spcPct">("a:spcPct");

/**
 * Type guard for mc:AlternateContent element.
 */
export const isMcAlternateContent = createElementGuard<"mc:AlternateContent">("mc:AlternateContent");

/**
 * Type guard for mc:Choice element.
 */
export const isMcChoice = createElementGuard<"mc:Choice">("mc:Choice");

/**
 * Type guard for mc:Fallback element.
 */
export const isMcFallback = createElementGuard<"mc:Fallback">("mc:Fallback");

/**
 * Type guard for a:buChar (Bullet Character) element.
 */
export const isABuChar = createElementGuard<"a:buChar">("a:buChar");

/**
 * Type guard for a:buAutoNum (Bullet Auto Number) element.
 */
export const isABuAutoNum = createElementGuard<"a:buAutoNum">("a:buAutoNum");

/**
 * Type guard for a:buNone (No Bullet) element.
 */
export const isABuNone = createElementGuard<"a:buNone">("a:buNone");

/**
 * Type guard for p:sld (Slide) element.
 */
export const isPSld = createElementGuard<"p:sld">("p:sld", (el) => {
  return getChild(el, "p:cSld") !== undefined;
});

/**
 * Type guard for p:cSld (Common Slide Data) element.
 */
export const isPCSld = createElementGuard<"p:cSld">("p:cSld");

/**
 * Type guard for p:spTree (Shape Tree) element.
 */
export const isPSpTree = createElementGuard<"p:spTree">("p:spTree");

/**
 * Type guard for p:xfrm (Transform) element.
 */
export const isPXfrm = createElementGuard<"p:xfrm">("p:xfrm");

/**
 * Type guard for c:chartSpace element.
 */
export const isCChartSpace = createElementGuard<"c:chartSpace">("c:chartSpace");

/**
 * Type guard for c:chart element.
 */
export const isCChart = createElementGuard<"c:chart">("c:chart");

/**
 * Type guard for c:plotArea element.
 */
export const isCPlotArea = createElementGuard<"c:plotArea">("c:plotArea");

/**
 * Type guard for dgm:relIds element.
 */
export const isDgmRelIds = createElementGuard<"dgm:relIds">("dgm:relIds");

/**
 * Type guard for a:graphic element.
 */
export const isAGraphic = createElementGuard<"a:graphic">("a:graphic");

/**
 * Type guard for a:graphicData element.
 */
export const isAGraphicData = createElementGuard<"a:graphicData">("a:graphicData");

// =============================================================================
// Convenience Accessors
// =============================================================================

/**
 * Get shape properties (p:spPr) from a shape-like element.
 * Works with p:sp (Shape), p:pic (Picture), and p:cxnSp (Connection Shape).
 *
 * @see ECMA-376 Part 1, Section 19.3.1.44 (p:spPr)
 */
export function getShapeProperties(shape: PShapePropertiesContainer): PSpPrElement | undefined {
  return getTypedChildElement(shape, "p:spPr", isPSpPr);
}

/**
 * Get text body (p:txBody) from a shape element.
 */
export function getTextBody(shape: PSpElement): PTxBodyElement | undefined {
  return getTypedChildElement(shape, "p:txBody", isPTxBody);
}

/**
 * Get transform (a:xfrm) from shape properties.
 */
export function getTransform(spPr: PSpPrElement): AXfrmElement | undefined {
  return getTypedChildElement(spPr, "a:xfrm", isAXfrm);
}

/**
 * Get offset (a:off) from transform.
 */
export function getOffset(xfrm: AXfrmElement): AOffElement | undefined {
  return getTypedChildElement(xfrm, "a:off", isAOff);
}

/**
 * Get extent (a:ext) from transform.
 */
export function getExtent(xfrm: AXfrmElement): AExtElement | undefined {
  return getTypedChildElement(xfrm, "a:ext", isAExt);
}

/**
 * Get all paragraphs from a text body.
 */
export function getParagraphs(txBody: PTxBodyElement | ATxBodyElement): readonly APElement[] {
  return getTypedChildren(txBody, "a:p", isAP);
}

/**
 * Get all text runs from a paragraph.
 */
export function getTextRuns(paragraph: APElement): readonly ARElement[] {
  return getTypedChildren(paragraph, "a:r", isAR);
}

/**
 * Get text content from a text run.
 */
export function getRunText(run: ARElement): string {
  const textElement = getChild(run, "a:t");
  if (textElement === undefined) {
    return "";
  }
  return getTextContent(textElement);
}

/**
 * Get run properties from a text run.
 */
export function getRunProperties(run: ARElement): ARPrElement | undefined {
  return getTypedChildElement(run, "a:rPr", isARPr);
}

/**
 * Get paragraph properties from a paragraph.
 */
export function getParagraphProperties(paragraph: APElement): APPrElement | undefined {
  return getTypedChildElement(paragraph, "a:pPr", isAPPr);
}

/**
 * Get table rows from a table.
 */
export function getTableRows(table: ATblElement): readonly ATrElement[] {
  return getTypedChildren(table, "a:tr", isATr);
}

/**
 * Get table cells from a row.
 */
export function getTableCells(row: ATrElement): readonly ATcElement[] {
  return getTypedChildren(row, "a:tc", isATc);
}

/**
 * Get line properties (a:ln) from shape properties.
 */
export function getLineProperties(spPr: PSpPrElement): ALnElement | undefined {
  return getTypedChildElement(spPr, "a:ln", isALn);
}

/**
 * Get solid fill from an element.
 */
export function getSolidFill(element: XmlElement): ASolidFillElement | undefined {
  return getTypedChildElement(element, "a:solidFill", isASolidFill);
}

/**
 * Get gradient fill from an element.
 */
export function getGradientFill(element: XmlElement): AGradFillElement | undefined {
  return getTypedChildElement(element, "a:gradFill", isAGradFill);
}

/**
 * Get preset geometry from shape properties.
 */
export function getPresetGeometry(spPr: PSpPrElement): APrstGeomElement | undefined {
  return getTypedChildElement(spPr, "a:prstGeom", isAPrstGeom);
}

/**
 * Get custom geometry from shape properties.
 */
export function getCustomGeometry(spPr: PSpPrElement): ACustGeomElement | undefined {
  return getTypedChildElement(spPr, "a:custGeom", isACustGeom);
}

// =============================================================================
// Text Run Content Accessors (ECMA-376 Part 1, Section 21.1.2.3)
// =============================================================================

/**
 * Text run content - union of all valid paragraph children.
 * @see ECMA-376 Part 1, 21.1.2.2.6 (a:p content model)
 */
export type TextRunContent = ARElement | AFldElement | ABrElement;

/**
 * Get all text runs from a paragraph (a:r elements only).
 * @see ECMA-376 Part 1, 21.1.2.3.8 (a:r)
 */
export function getTextRunsFromParagraph(paragraph: APElement): readonly ARElement[] {
  return getTypedChildren(paragraph, "a:r", isAR);
}

/**
 * Get all field elements from a paragraph.
 * @see ECMA-376 Part 1, 21.1.2.2.2 (a:fld)
 */
export function getFieldsFromParagraph(paragraph: APElement): readonly AFldElement[] {
  return getTypedChildren(paragraph, "a:fld", isAFld);
}

/**
 * Get all line breaks from a paragraph.
 * @see ECMA-376 Part 1, 21.1.2.2.1 (a:br)
 */
export function getBreaksFromParagraph(paragraph: APElement): readonly ABrElement[] {
  return getTypedChildren(paragraph, "a:br", isABr);
}

/**
 * Get hyperlink from run properties.
 * @see ECMA-376 Part 1, 21.1.2.3.5 (a:hlinkClick)
 */
export function getHyperlink(rPr: ARPrElement): AHlinkClickElement | undefined {
  return getTypedChildElement(rPr, "a:hlinkClick", isAHlinkClick);
}

/**
 * Get highlight color element from run properties.
 * @see ECMA-376 Part 1, 21.1.2.3.4 (a:highlight)
 */
export function getHighlight(rPr: ARPrElement): AHighlightElement | undefined {
  return getTypedChildElement(rPr, "a:highlight", isAHighlight);
}

/**
 * Run property extraction result.
 * Contains all typed values from a:rPr.
 */
export type RunPropertyValues = {
  /** Language code */
  lang: string | undefined;
  /** Font size in points (parsed from 1/100 pt) */
  fontSize: number | undefined;
  /** Bold flag */
  bold: boolean | undefined;
  /** Italic flag */
  italic: boolean | undefined;
  /** Underline type */
  underline: string | undefined;
  /** Strikethrough type */
  strikethrough: string | undefined;
  /** Letter spacing in 1/1000 em */
  spacing: number | undefined;
  /** Capitalization (small, all) */
  capitalization: string | undefined;
  /** Baseline offset (percentage) */
  baseline: number | undefined;
};

/**
 * Extract all property values from run properties element.
 * @see ECMA-376 Part 1, 21.1.2.3.9 (a:rPr)
 */
export function extractRunPropertyValues(rPr: ARPrElement | undefined): RunPropertyValues {
  if (rPr === undefined) {
    return {
      lang: undefined,
      fontSize: undefined,
      bold: undefined,
      italic: undefined,
      underline: undefined,
      strikethrough: undefined,
      spacing: undefined,
      capitalization: undefined,
      baseline: undefined,
    };
  }

  const szVal = getTypedAttr(rPr, "sz");
  const spcVal = getTypedAttr(rPr, "spc");
  const baselineVal = getTypedAttr(rPr, "baseline");

  return {
    lang: getTypedAttr(rPr, "lang"),
    fontSize: szVal !== undefined ? parseInt(szVal, 10) / 100 : undefined,
    bold: getBooleanAttr(rPr, "b"),
    italic: getBooleanAttr(rPr, "i"),
    underline: getTypedAttr(rPr, "u"),
    strikethrough: getTypedAttr(rPr, "strike"),
    spacing: spcVal !== undefined ? parseInt(spcVal, 10) : undefined,
    capitalization: getTypedAttr(rPr, "cap"),
    baseline: baselineVal !== undefined ? parseInt(baselineVal, 10) : undefined,
  };
}

/**
 * Check if run properties indicate RTL text based on language.
 */
export function isRtlLanguage(lang: string | undefined): boolean {
  if (lang === undefined) {
    return false;
  }
  // Common RTL language codes
  const rtlPrefixes = ["ar", "he", "fa", "ur", "yi", "ps", "sd", "ku"];
  const langLower = lang.toLowerCase();
  return rtlPrefixes.some((prefix) => langLower.startsWith(prefix));
}

// =============================================================================
// Slide Structure Accessors
// =============================================================================

/**
 * Get p:sld element from a slide document root.
 * @param slideDoc - Slide document XmlElement (could be XmlDocument root child)
 */
export function getSlideElement(slideDoc: XmlElement): PSldElement | undefined {
  return getTypedChildElement(slideDoc, "p:sld", isPSld);
}

/**
 * Get p:cSld from slide element.
 */
export function getCommonSlideData(sld: PSldElement): PCSldElement | undefined {
  return getTypedChildElement(sld, "p:cSld", isPCSld);
}

/**
 * Get p:spTree from common slide data.
 */
export function getShapeTree(cSld: PCSldElement): PSpTreeElement | undefined {
  return getTypedChildElement(cSld, "p:spTree", isPSpTree);
}

/**
 * Get spTree from slide document in one call.
 * Traverses: slideDoc → p:sld → p:cSld → p:spTree
 */
export function getSpTreeFromSlideDoc(slideDoc: XmlElement): PSpTreeElement | undefined {
  const sld = getSlideElement(slideDoc);
  if (sld === undefined) {
    return undefined;
  }
  const cSld = getCommonSlideData(sld);
  if (cSld === undefined) {
    return undefined;
  }
  return getShapeTree(cSld);
}

// =============================================================================
// Bullet Accessors
// =============================================================================

/**
 * Get bullet character element from paragraph properties.
 */
export function getBulletChar(pPr: APPrElement | XmlElement): ABuCharElement | undefined {
  return getTypedChildElement(pPr, "a:buChar", isABuChar);
}

/**
 * Get bullet auto-number element from paragraph properties.
 */
export function getBulletAutoNum(pPr: APPrElement | XmlElement): ABuAutoNumElement | undefined {
  return getTypedChildElement(pPr, "a:buAutoNum", isABuAutoNum);
}

/**
 * Check if paragraph properties specify no bullet.
 */
export function hasBulletNone(pPr: APPrElement | XmlElement): boolean {
  return getChild(pPr, "a:buNone") !== undefined;
}

/**
 * Parsed bullet information.
 */
export type ParsedBullet =
  | { type: "none" }
  | { type: "char"; char: string }
  | { type: "autoNum"; numFormat: string; startAt: number }
  | undefined;

/**
 * Parse bullet from paragraph properties.
 * Returns structured bullet info validated against ECMA-376.
 */
export function parseBullet(pPr: APPrElement | XmlElement | undefined): ParsedBullet {
  if (pPr === undefined) {
    return undefined;
  }

  // Check for explicit no bullet
  if (hasBulletNone(pPr)) {
    return { type: "none" };
  }

  // Check for character bullet
  const buChar = getBulletChar(pPr);
  if (buChar !== undefined) {
    const char = getTypedAttr(buChar, "char") ?? "•";
    return { type: "char", char };
  }

  // Check for auto-number bullet
  const buAutoNum = getBulletAutoNum(pPr);
  if (buAutoNum !== undefined) {
    const numFormat = getTypedAttr(buAutoNum, "type") ?? "arabicPeriod";
    const startAtStr = getTypedAttr(buAutoNum, "startAt");
    const startAt = startAtStr !== undefined ? parseInt(startAtStr, 10) : 1;
    return { type: "autoNum", numFormat, startAt };
  }

  return undefined;
}

// =============================================================================
// Transform Accessors
// =============================================================================

/**
 * Parsed transform data.
 */
export type ParsedTransformData = {
  x: number;
  y: number;
  cx: number;
  cy: number;
  rot: number;
  flipH: boolean;
  flipV: boolean;
};

/**
 * Parse transform element to numeric values.
 * @param xfrm - Transform element (a:xfrm or p:xfrm)
 * @returns Parsed transform data or undefined if missing required children
 */
export function parseTransformData(xfrm: AXfrmElement | PXfrmElement | XmlElement | undefined): ParsedTransformData | undefined {
  if (xfrm === undefined) {
    return undefined;
  }

  const off = getChild(xfrm, "a:off");
  const ext = getChild(xfrm, "a:ext");

  if (off === undefined || ext === undefined) {
    return undefined;
  }

  const x = getNumericAttr(off, "x");
  const y = getNumericAttr(off, "y");
  const cx = getNumericAttr(ext, "cx");
  const cy = getNumericAttr(ext, "cy");

  if (x === undefined || y === undefined || cx === undefined || cy === undefined) {
    return undefined;
  }

  const rot = getNumericAttr(xfrm, "rot") ?? 0;
  const flipH = getBooleanAttr(xfrm, "flipH") ?? false;
  const flipV = getBooleanAttr(xfrm, "flipV") ?? false;

  return { x, y, cx, cy, rot, flipH, flipV };
}

// =============================================================================
// Graphic Frame Accessors
// =============================================================================

/**
 * Get a:graphic from graphic frame.
 */
export function getGraphic(graphicFrame: PGraphicFrameElement): AGraphicElement | undefined {
  return getTypedChildElement(graphicFrame, "a:graphic", isAGraphic);
}

/**
 * Get a:graphicData from a:graphic.
 */
export function getGraphicData(graphic: AGraphicElement): AGraphicDataElement | undefined {
  return getTypedChildElement(graphic, "a:graphicData", isAGraphicData);
}

/**
 * Get graphic data from graphic frame in one call.
 */
export function getGraphicDataFromFrame(graphicFrame: PGraphicFrameElement | XmlElement): AGraphicDataElement | undefined {
  const graphic = getTypedChildElement(graphicFrame, "a:graphic", isAGraphic);
  if (graphic === undefined) {
    return undefined;
  }
  return getGraphicData(graphic);
}

/**
 * Check what content type is in graphic data.
 */
export function getGraphicContentType(graphicData: AGraphicDataElement): "chart" | "table" | "diagram" | undefined {
  if (getChild(graphicData, "c:chart") !== undefined) {
    return "chart";
  }
  if (getChild(graphicData, "a:tbl") !== undefined) {
    return "table";
  }
  if (getChild(graphicData, "dgm:relIds") !== undefined) {
    return "diagram";
  }
  return undefined;
}

// =============================================================================
// Chart Accessors
// =============================================================================

/**
 * Get plot area from chart document.
 * Traverses: chartDoc → c:chartSpace → c:chart → c:plotArea
 */
export function getPlotAreaFromChart(chartDoc: XmlElement): CPlotAreaElement | undefined {
  const chartSpace = getTypedChildElement(chartDoc, "c:chartSpace", isCChartSpace);
  if (chartSpace === undefined) {
    return undefined;
  }
  const chart = getTypedChildElement(chartSpace, "c:chart", isCChart);
  if (chart === undefined) {
    return undefined;
  }
  return getTypedChildElement(chart, "c:plotArea", isCPlotArea);
}
