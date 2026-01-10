/**
 * @file Shape Differ - Detect changes between Domain shapes
 *
 * Compares two Slide states and detects which shapes have been
 * added, removed, or modified. Uses nonVisual.id to correlate shapes.
 *
 * @see docs/plans/pptx-export/phase-2-diff-detection-patch.md
 */

import type { Shape, SpShape, PicShape, GrpShape, CxnShape, GraphicFrame } from "../../domain/shape";
import type { Slide } from "../../domain/slide/types";
import type { Transform } from "../../domain/geometry";
import type { Fill, Line } from "../../domain/color/types";
import type { TextBody } from "../../domain/text";
import type { Effects } from "../../domain/effects";

// =============================================================================
// Change Types
// =============================================================================

/**
 * Types of shape changes that can be detected.
 */
export type ShapeChange =
  | ShapeModified
  | ShapeAdded
  | ShapeRemoved;

/**
 * Shape was modified - contains list of property changes.
 */
export type ShapeModified = {
  readonly type: "modified";
  readonly shapeId: string;
  readonly shapeType: Shape["type"];
  readonly changes: readonly PropertyChange[];
};

/**
 * Shape was added.
 */
export type ShapeAdded = {
  readonly type: "added";
  readonly shape: Shape;
};

/**
 * Shape was removed.
 */
export type ShapeRemoved = {
  readonly type: "removed";
  readonly shapeId: string;
};

/**
 * Individual property change on a shape.
 */
export type PropertyChange =
  | TransformChange
  | FillChange
  | LineChange
  | TextBodyChange
  | EffectsChange
  | GeometryChange
  | BlipFillChange;

export type TransformChange = {
  readonly property: "transform";
  readonly oldValue: Transform | undefined;
  readonly newValue: Transform | undefined;
};

export type FillChange = {
  readonly property: "fill";
  readonly oldValue: Fill | undefined;
  readonly newValue: Fill | undefined;
};

export type LineChange = {
  readonly property: "line";
  readonly oldValue: Line | undefined;
  readonly newValue: Line | undefined;
};

export type TextBodyChange = {
  readonly property: "textBody";
  readonly oldValue: TextBody | undefined;
  readonly newValue: TextBody | undefined;
};

export type EffectsChange = {
  readonly property: "effects";
  readonly oldValue: Effects | undefined;
  readonly newValue: Effects | undefined;
};

export type GeometryChange = {
  readonly property: "geometry";
  readonly oldValue: unknown;
  readonly newValue: unknown;
};

export type BlipFillChange = {
  readonly property: "blipFill";
  readonly oldValue: unknown;
  readonly newValue: unknown;
};

// =============================================================================
// Main Detection Functions
// =============================================================================

/**
 * Detect all changes between two slide states.
 *
 * @param original - The original slide state (from apiSlide parsing)
 * @param modified - The modified slide state (current editor state)
 * @returns List of shape changes
 */
export function detectSlideChanges(
  original: Slide,
  modified: Slide,
): readonly ShapeChange[] {
  const changes: ShapeChange[] = [];

  // Build a map of original shapes by ID
  const originalById = buildShapeMap(original.shapes);
  const modifiedById = buildShapeMap(modified.shapes);

  // Detect removed shapes
  for (const [id, _] of originalById) {
    if (!modifiedById.has(id)) {
      changes.push({ type: "removed", shapeId: id });
    }
  }

  // Detect added shapes
  for (const [id, shape] of modifiedById) {
    if (!originalById.has(id)) {
      changes.push({ type: "added", shape });
    }
  }

  // Detect modified shapes
  for (const [id, modifiedShape] of modifiedById) {
    const originalShape = originalById.get(id);
    if (originalShape) {
      const propertyChanges = detectShapePropertyChanges(originalShape, modifiedShape);
      if (propertyChanges.length > 0) {
        changes.push({
          type: "modified",
          shapeId: id,
          shapeType: modifiedShape.type,
          changes: propertyChanges,
        });
      }
    }
  }

  return changes;
}

/**
 * Build a map of shapes by their nonVisual.id.
 */
function buildShapeMap(shapes: readonly Shape[]): Map<string, Shape> {
  const map = new Map<string, Shape>();

  for (const shape of shapes) {
    const id = getShapeId(shape);
    if (id) {
      map.set(id, shape);
    }

    // Recursively add group children
    if (shape.type === "grpSp") {
      const childMap = buildShapeMap(shape.children);
      for (const [childId, childShape] of childMap) {
        map.set(childId, childShape);
      }
    }
  }

  return map;
}

/**
 * Get the ID of a shape from its nonVisual properties.
 */
export function getShapeId(shape: Shape): string | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "grpSp":
    case "cxnSp":
    case "graphicFrame":
      return shape.nonVisual.id;
    case "contentPart":
      return undefined; // ContentPart doesn't have nonVisual.id in the same way
  }
}

// =============================================================================
// Property Change Detection
// =============================================================================

/**
 * Detect property changes between two shapes.
 *
 * Compares transform, fill, line, textBody, and effects.
 */
export function detectShapePropertyChanges(
  original: Shape,
  modified: Shape,
): readonly PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Only compare shapes of the same type
  if (original.type !== modified.type) {
    // Type mismatch - treat as complete replacement
    // This shouldn't happen in normal editing scenarios
    return [];
  }

  switch (original.type) {
    case "sp":
      changes.push(...detectSpShapeChanges(original, modified as SpShape));
      break;
    case "pic":
      changes.push(...detectPicShapeChanges(original, modified as PicShape));
      break;
    case "grpSp":
      changes.push(...detectGrpShapeChanges(original, modified as GrpShape));
      break;
    case "cxnSp":
      changes.push(...detectCxnShapeChanges(original, modified as CxnShape));
      break;
    case "graphicFrame":
      changes.push(...detectGraphicFrameChanges(original, modified as GraphicFrame));
      break;
  }

  return changes;
}

/**
 * Detect changes in SpShape (standard shape).
 */
function detectSpShapeChanges(
  original: SpShape,
  modified: SpShape,
): PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Transform
  if (!isTransformEqual(original.properties.transform, modified.properties.transform)) {
    changes.push({
      property: "transform",
      oldValue: original.properties.transform,
      newValue: modified.properties.transform,
    });
  }

  // Fill
  if (!isFillEqual(original.properties.fill, modified.properties.fill)) {
    changes.push({
      property: "fill",
      oldValue: original.properties.fill,
      newValue: modified.properties.fill,
    });
  }

  // Line
  if (!isLineEqual(original.properties.line, modified.properties.line)) {
    changes.push({
      property: "line",
      oldValue: original.properties.line,
      newValue: modified.properties.line,
    });
  }

  // TextBody
  if (!isTextBodyEqual(original.textBody, modified.textBody)) {
    changes.push({
      property: "textBody",
      oldValue: original.textBody,
      newValue: modified.textBody,
    });
  }

  // Effects
  if (!isEffectsEqual(original.properties.effects, modified.properties.effects)) {
    changes.push({
      property: "effects",
      oldValue: original.properties.effects,
      newValue: modified.properties.effects,
    });
  }

  // Geometry
  if (!isGeometryEqual(original.properties.geometry, modified.properties.geometry)) {
    changes.push({
      property: "geometry",
      oldValue: original.properties.geometry,
      newValue: modified.properties.geometry,
    });
  }

  return changes;
}

/**
 * Detect changes in PicShape (picture).
 */
function detectPicShapeChanges(
  original: PicShape,
  modified: PicShape,
): PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Transform
  if (!isTransformEqual(original.properties.transform, modified.properties.transform)) {
    changes.push({
      property: "transform",
      oldValue: original.properties.transform,
      newValue: modified.properties.transform,
    });
  }

  // BlipFill
  if (!deepEqual(original.blipFill, modified.blipFill)) {
    changes.push({
      property: "blipFill",
      oldValue: original.blipFill,
      newValue: modified.blipFill,
    });
  }

  // Effects
  if (!isEffectsEqual(original.properties.effects, modified.properties.effects)) {
    changes.push({
      property: "effects",
      oldValue: original.properties.effects,
      newValue: modified.properties.effects,
    });
  }

  return changes;
}

/**
 * Detect changes in GrpShape (group).
 */
function detectGrpShapeChanges(
  original: GrpShape,
  modified: GrpShape,
): PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Group transform
  if (!isTransformEqual(original.properties.transform, modified.properties.transform)) {
    changes.push({
      property: "transform",
      oldValue: original.properties.transform,
      newValue: modified.properties.transform,
    });
  }

  // Fill
  if (!isFillEqual(original.properties.fill, modified.properties.fill)) {
    changes.push({
      property: "fill",
      oldValue: original.properties.fill,
      newValue: modified.properties.fill,
    });
  }

  // Effects
  if (!isEffectsEqual(original.properties.effects, modified.properties.effects)) {
    changes.push({
      property: "effects",
      oldValue: original.properties.effects,
      newValue: modified.properties.effects,
    });
  }

  // Note: Child changes are detected separately by detectSlideChanges

  return changes;
}

/**
 * Detect changes in CxnShape (connector).
 */
function detectCxnShapeChanges(
  original: CxnShape,
  modified: CxnShape,
): PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Transform
  if (!isTransformEqual(original.properties.transform, modified.properties.transform)) {
    changes.push({
      property: "transform",
      oldValue: original.properties.transform,
      newValue: modified.properties.transform,
    });
  }

  // Fill
  if (!isFillEqual(original.properties.fill, modified.properties.fill)) {
    changes.push({
      property: "fill",
      oldValue: original.properties.fill,
      newValue: modified.properties.fill,
    });
  }

  // Line
  if (!isLineEqual(original.properties.line, modified.properties.line)) {
    changes.push({
      property: "line",
      oldValue: original.properties.line,
      newValue: modified.properties.line,
    });
  }

  return changes;
}

/**
 * Detect changes in GraphicFrame (table, chart, diagram).
 */
function detectGraphicFrameChanges(
  original: GraphicFrame,
  modified: GraphicFrame,
): PropertyChange[] {
  const changes: PropertyChange[] = [];

  // Transform
  if (!isTransformEqual(original.transform, modified.transform)) {
    changes.push({
      property: "transform",
      oldValue: original.transform,
      newValue: modified.transform,
    });
  }

  // Content changes are complex and handled separately

  return changes;
}

// =============================================================================
// Equality Comparisons
// =============================================================================

/**
 * Compare two Transform values for equality.
 */
export function isTransformEqual(
  a: Transform | undefined,
  b: Transform | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.rotation === b.rotation &&
    a.flipH === b.flipH &&
    a.flipV === b.flipV
  );
}

/**
 * Compare two Fill values for equality.
 * Uses deep comparison for complex fill types.
 */
export function isFillEqual(
  a: Fill | undefined,
  b: Fill | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return deepEqual(a, b);
}

/**
 * Compare two Line values for equality.
 */
export function isLineEqual(
  a: Line | undefined,
  b: Line | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return deepEqual(a, b);
}

/**
 * Compare two TextBody values for equality.
 */
export function isTextBodyEqual(
  a: TextBody | undefined,
  b: TextBody | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return deepEqual(a, b);
}

/**
 * Compare two Effects values for equality.
 */
export function isEffectsEqual(
  a: Effects | undefined,
  b: Effects | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return deepEqual(a, b);
}

/**
 * Compare two Geometry values for equality.
 */
export function isGeometryEqual(
  a: unknown,
  b: unknown,
): boolean {
  return deepEqual(a, b);
}

/**
 * Deep equality comparison for complex objects.
 * Handles nested objects, arrays, and primitives.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (typeof a !== "object" || a === null || b === null) {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    )) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if any changes exist.
 */
export function hasChanges(changes: readonly ShapeChange[]): boolean {
  return changes.length > 0;
}

/**
 * Get changes of a specific type.
 */
export function getChangesByType<T extends ShapeChange["type"]>(
  changes: readonly ShapeChange[],
  type: T,
): readonly Extract<ShapeChange, { type: T }>[] {
  return changes.filter((c): c is Extract<ShapeChange, { type: T }> => c.type === type);
}

/**
 * Get modified changes for a specific property.
 */
export function getModifiedByProperty<T extends PropertyChange["property"]>(
  change: ShapeModified,
  property: T,
): Extract<PropertyChange, { property: T }> | undefined {
  return change.changes.find(
    (c): c is Extract<PropertyChange, { property: T }> => c.property === property,
  );
}
