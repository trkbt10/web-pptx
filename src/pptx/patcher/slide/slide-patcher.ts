/**
 * @file Slide Patcher - Apply changes to slide XML
 *
 * Takes ShapeChange[] from shape-differ and applies them to the XmlDocument.
 * This is the integration layer that connects change detection to XML modification.
 *
 * @see docs/plans/pptx-export/phase-2-diff-detection-patch.md
 */

import type { XmlDocument, XmlElement } from "../../../xml";
import { isXmlElement, getChild } from "../../../xml";
import type { ShapeChange, PropertyChange } from "../core/shape-differ";
import {
  updateDocumentRoot,
  getDocumentRoot,
  findShapeById,
  replaceShapeById,
  removeShapeById,
  appendChild,
  updateChildByName,
  replaceChildByName,
  createElement,
  setAttributes,
} from "../core/xml-mutator";

// =============================================================================
// Main Patching Function
// =============================================================================

/**
 * Apply shape changes to a slide XML document.
 *
 * @param slideXml - The original slide XML document
 * @param changes - List of changes to apply
 * @returns Updated slide XML document
 */
export function patchSlideXml(
  slideXml: XmlDocument,
  changes: readonly ShapeChange[],
): XmlDocument {
  let result = slideXml;

  for (const change of changes) {
    switch (change.type) {
      case "removed":
        result = applyRemoval(result, change.shapeId);
        break;
      case "added":
        // Shape addition requires full serialization (Phase 6)
        // For now, we skip added shapes
        break;
      case "modified":
        result = applyModification(result, change.shapeId, change.changes);
        break;
    }
  }

  return result;
}

// =============================================================================
// Removal
// =============================================================================

/**
 * Remove a shape from the slide XML.
 */
function applyRemoval(doc: XmlDocument, shapeId: string): XmlDocument {
  return updateDocumentRoot(doc, (root) => {
    // Find p:cSld/p:spTree
    const cSld = getChild(root, "p:cSld");
    if (!cSld) return root;

    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) return root;

    // Remove the shape
    const newSpTree = removeShapeById(spTree, shapeId);

    // Update the tree
    return updateChildByName(root, "p:cSld", (cSldEl) =>
      replaceChildByName(cSldEl, "p:spTree", newSpTree),
    );
  });
}

// =============================================================================
// Modification
// =============================================================================

/**
 * Apply property modifications to a shape.
 */
function applyModification(
  doc: XmlDocument,
  shapeId: string,
  changes: readonly PropertyChange[],
): XmlDocument {
  return updateDocumentRoot(doc, (root) => {
    // Find p:cSld/p:spTree
    const cSld = getChild(root, "p:cSld");
    if (!cSld) return root;

    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) return root;

    // Find the shape to modify
    const shape = findShapeById(spTree, shapeId);
    if (!shape) return root;

    // Apply each change to the shape
    let modifiedShape = shape;
    for (const change of changes) {
      modifiedShape = applyPropertyChange(modifiedShape, change);
    }

    // Replace the shape in spTree
    const newSpTree = replaceShapeById(spTree, shapeId, modifiedShape);

    // Update the tree
    return updateChildByName(root, "p:cSld", (cSldEl) =>
      replaceChildByName(cSldEl, "p:spTree", newSpTree),
    );
  });
}

/**
 * Apply a single property change to a shape element.
 */
function applyPropertyChange(
  shape: XmlElement,
  change: PropertyChange,
): XmlElement {
  switch (change.property) {
    case "transform":
      return applyTransformChange(shape, change);
    case "fill":
      return applyFillChange(shape, change);
    case "line":
      return applyLineChange(shape, change);
    case "textBody":
      return applyTextBodyChange(shape, change);
    case "effects":
      return applyEffectsChange(shape, change);
    case "geometry":
      return applyGeometryChange(shape, change);
    case "blipFill":
      return applyBlipFillChange(shape, change);
    default:
      return shape;
  }
}

// =============================================================================
// Transform Change
// =============================================================================

/**
 * Apply transform change to shape XML.
 *
 * Updates a:xfrm within p:spPr or p:grpSpPr.
 */
function applyTransformChange(
  shape: XmlElement,
  change: PropertyChange & { property: "transform" },
): XmlElement {
  const newTransform = change.newValue;
  if (!newTransform) {
    // Transform removed - rare case
    return shape;
  }

  // Find the shape properties element
  const spPrName = getShapePropertiesName(shape.name);
  const spPr = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === spPrName,
  );

  if (!spPr) {
    return shape;
  }

  // Find or create a:xfrm
  const xfrm = getChild(spPr, "a:xfrm");

  // Build new xfrm
  const newXfrm = buildTransformElement(newTransform, xfrm);

  // Replace xfrm in spPr
  const newSpPr = xfrm
    ? replaceChildByName(spPr, "a:xfrm", newXfrm)
    : prependXfrm(spPr, newXfrm);

  // Replace spPr in shape
  return replaceChildByName(shape, spPrName, newSpPr);
}

/**
 * Get the shape properties element name for a shape type.
 */
function getShapePropertiesName(shapeName: string): string {
  switch (shapeName) {
    case "p:grpSp":
      return "p:grpSpPr";
    case "p:pic":
      return "p:spPr";
    case "p:cxnSp":
      return "p:spPr";
    case "p:graphicFrame":
      return "p:xfrm"; // GraphicFrame uses p:xfrm directly
    default:
      return "p:spPr";
  }
}

/**
 * Build an a:xfrm element from Transform.
 * Preserves existing attributes like flipH/flipV if present.
 */
function buildTransformElement(
  transform: NonNullable<PropertyChange["newValue"]>,
  existing?: XmlElement,
): XmlElement {
  const t = transform as {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
  };

  // Build attributes
  const attrs: Record<string, string> = {};

  // Rotation (in 60000ths of a degree)
  if (t.rotation !== 0) {
    attrs.rot = String(Math.round(t.rotation * 60000));
  }

  // Flip attributes
  if (t.flipH) {
    attrs.flipH = "1";
  }
  if (t.flipV) {
    attrs.flipV = "1";
  }

  // Preserve other existing attributes
  if (existing) {
    for (const [key, value] of Object.entries(existing.attrs)) {
      if (!(key in attrs) && key !== "rot" && key !== "flipH" && key !== "flipV") {
        attrs[key] = value;
      }
    }
  }

  // Build children (a:off and a:ext)
  const offElement = createElement("a:off", {
    x: String(Math.round(t.x)),
    y: String(Math.round(t.y)),
  });

  const extElement = createElement("a:ext", {
    cx: String(Math.round(t.width)),
    cy: String(Math.round(t.height)),
  });

  // Preserve child offset/extent for groups (chOff, chExt)
  const existingChildren: XmlElement[] = [];
  if (existing) {
    for (const child of existing.children) {
      if (isXmlElement(child) && (child.name === "a:chOff" || child.name === "a:chExt")) {
        existingChildren.push(child);
      }
    }
  }

  return createElement("a:xfrm", attrs, [offElement, extElement, ...existingChildren]);
}

/**
 * Prepend a:xfrm to spPr (it should come first).
 */
function prependXfrm(spPr: XmlElement, xfrm: XmlElement): XmlElement {
  return {
    ...spPr,
    children: [xfrm, ...spPr.children],
  };
}

// =============================================================================
// Fill Change (Stub - Full implementation in Phase 4)
// =============================================================================

function applyFillChange(
  shape: XmlElement,
  _change: PropertyChange & { property: "fill" },
): XmlElement {
  // TODO: Implement in Phase 4
  // For now, return shape unchanged
  return shape;
}

// =============================================================================
// Line Change (Stub - Full implementation in Phase 4)
// =============================================================================

function applyLineChange(
  shape: XmlElement,
  _change: PropertyChange & { property: "line" },
): XmlElement {
  // TODO: Implement in Phase 4
  return shape;
}

// =============================================================================
// TextBody Change (Stub - Full implementation in Phase 5)
// =============================================================================

function applyTextBodyChange(
  shape: XmlElement,
  _change: PropertyChange & { property: "textBody" },
): XmlElement {
  // TODO: Implement in Phase 5
  return shape;
}

// =============================================================================
// Effects Change (Stub - Full implementation in Phase 4)
// =============================================================================

function applyEffectsChange(
  shape: XmlElement,
  _change: PropertyChange & { property: "effects" },
): XmlElement {
  // TODO: Implement in Phase 4
  return shape;
}

// =============================================================================
// Geometry Change (Stub - Future phase)
// =============================================================================

function applyGeometryChange(
  shape: XmlElement,
  _change: PropertyChange & { property: "geometry" },
): XmlElement {
  // TODO: Implement in future phase
  return shape;
}

// =============================================================================
// BlipFill Change (Stub - Full implementation in Phase 7)
// =============================================================================

function applyBlipFillChange(
  shape: XmlElement,
  _change: PropertyChange & { property: "blipFill" },
): XmlElement {
  // TODO: Implement in Phase 7
  return shape;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the spTree from a slide document.
 */
export function getSpTree(doc: XmlDocument): XmlElement | null {
  const root = getDocumentRoot(doc);
  if (!root) return null;

  const cSld = getChild(root, "p:cSld");
  if (!cSld) return null;

  return getChild(cSld, "p:spTree") ?? null;
}

/**
 * Check if a slide has any shapes.
 */
export function hasShapes(doc: XmlDocument): boolean {
  const spTree = getSpTree(doc);
  if (!spTree) return false;

  return spTree.children.some(
    (child) =>
      isXmlElement(child) &&
      ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"].includes(child.name),
  );
}
