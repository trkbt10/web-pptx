/**
 * @file Constraint resolution for INSTANCE nodes
 *
 * When an INSTANCE is resized relative to its SYMBOL, child positions
 * and sizes must be adjusted according to their constraint settings.
 *
 * Figma defines 5 constraint types per axis:
 * - MIN:     Anchored to left/top edge (position unchanged)
 * - CENTER:  Centered between edges (position shifts by half delta)
 * - MAX:     Anchored to right/bottom edge (position shifts by full delta)
 * - STRETCH: Anchored to both edges (position unchanged, size adjusts)
 * - SCALE:   Proportionally scaled (position and size scale by ratio)
 */

import type { FigNode } from "@oxen/fig/types";
import { CONSTRAINT_TYPE_VALUES } from "@oxen/fig/constants";

// =============================================================================
// Types
// =============================================================================

export type ConstraintKind = "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";

type AxisResult = {
  readonly pos: number;
  readonly dim: number;
};

// =============================================================================
// Single-axis resolution
// =============================================================================

/**
 * Resolve a single axis constraint.
 *
 * @param originalPos   Child's original position along this axis
 * @param originalDim   Child's original size along this axis
 * @param parentOrigDim SYMBOL's size along this axis
 * @param parentNewDim  INSTANCE's size along this axis
 * @param constraint    Constraint type for this axis
 */
export function resolveAxis(
  originalPos: number,
  originalDim: number,
  parentOrigDim: number,
  parentNewDim: number,
  constraint: ConstraintKind,
): AxisResult {
  const delta = parentNewDim - parentOrigDim;

  switch (constraint) {
    case "MIN":
      // Anchored to left/top: no change
      return { pos: originalPos, dim: originalDim };

    case "MAX":
      // Anchored to right/bottom: shift position by full delta
      return { pos: originalPos + delta, dim: originalDim };

    case "CENTER":
      // Centered: shift position by half delta
      return { pos: originalPos + delta / 2, dim: originalDim };

    case "STRETCH": {
      // Anchored to both edges: margins preserved, size adjusts
      const leftMargin = originalPos;
      const rightMargin = parentOrigDim - (originalPos + originalDim);
      const newDim = Math.max(0, parentNewDim - leftMargin - rightMargin);
      return { pos: leftMargin, dim: newDim };
    }

    case "SCALE": {
      // Proportionally scaled
      if (parentOrigDim === 0) {
        return { pos: originalPos, dim: originalDim };
      }
      const ratio = parentNewDim / parentOrigDim;
      return { pos: originalPos * ratio, dim: originalDim * ratio };
    }
  }
}

// =============================================================================
// Constraint extraction
// =============================================================================

/**
 * Extract constraint kind from a node's constraint field.
 * Returns "MIN" as default when unset.
 */
function getConstraintKind(
  constraintValue: unknown,
): ConstraintKind {
  if (!constraintValue || typeof constraintValue !== "object") {
    return "MIN";
  }
  const val = (constraintValue as { value?: number }).value;
  if (val === undefined) return "MIN";

  switch (val) {
    case CONSTRAINT_TYPE_VALUES.MIN: return "MIN";
    case CONSTRAINT_TYPE_VALUES.CENTER: return "CENTER";
    case CONSTRAINT_TYPE_VALUES.MAX: return "MAX";
    case CONSTRAINT_TYPE_VALUES.STRETCH: return "STRETCH";
    case CONSTRAINT_TYPE_VALUES.SCALE: return "SCALE";
    default: return "MIN";
  }
}

// =============================================================================
// Apply constraints to children
// =============================================================================

/**
 * Apply constraint resolution to direct children of a symbol/instance.
 *
 * Only processes depth-1 children (not recursive). Each child's
 * horizontalConstraint and verticalConstraint determine how its
 * position and size adjust when the parent is resized.
 *
 * @param children     Cloned children from the SYMBOL
 * @param symbolSize   Original SYMBOL size { x, y }
 * @param instanceSize Actual INSTANCE size { x, y }
 * @returns New array of children with adjusted transforms and sizes
 */
export function applyConstraintsToChildren(
  children: readonly FigNode[],
  symbolSize: { x: number; y: number },
  instanceSize: { x: number; y: number },
): readonly FigNode[] {
  return children.map((child) => {
    const nodeData = child as Record<string, unknown>;

    const hConstraint = getConstraintKind(nodeData.horizontalConstraint);
    const vConstraint = getConstraintKind(nodeData.verticalConstraint);

    // If both are MIN and no resize needed, skip
    if (
      hConstraint === "MIN" &&
      vConstraint === "MIN" &&
      symbolSize.x === instanceSize.x &&
      symbolSize.y === instanceSize.y
    ) {
      return child;
    }

    const transform = child.transform;
    const size = child.size;

    if (!transform || !size) {
      return child;
    }

    const origX = transform.m02 ?? 0;
    const origY = transform.m12 ?? 0;
    const origW = size.x ?? 0;
    const origH = size.y ?? 0;

    const hResult = resolveAxis(origX, origW, symbolSize.x, instanceSize.x, hConstraint);
    const vResult = resolveAxis(origY, origH, symbolSize.y, instanceSize.y, vConstraint);

    // Skip creating new object if nothing changed
    if (
      hResult.pos === origX &&
      hResult.dim === origW &&
      vResult.pos === origY &&
      vResult.dim === origH
    ) {
      return child;
    }

    const sizeChanged = hResult.dim !== origW || vResult.dim !== origH;
    const result: Record<string, unknown> = {
      ...child,
      transform: {
        ...transform,
        m02: hResult.pos,
        m12: vResult.pos,
      },
      size: {
        x: hResult.dim,
        y: vResult.dim,
      },
    };

    // When size changes, clear pre-baked geometry so the renderer
    // falls back to size-based shape rendering (rect, ellipse, etc.)
    if (sizeChanged) {
      delete result.fillGeometry;
      delete result.strokeGeometry;
    }

    return result as FigNode;
  });
}
