/**
 * @file Constraint resolution for INSTANCE nodes
 *
 * When an INSTANCE is resized relative to its SYMBOL, child positions
 * and sizes must be adjusted according to their constraint settings.
 *
 * The single-axis math lives in @oxen/fig/symbols (shared with builder).
 * This module provides the higher-level orchestration:
 * - applyConstraintsToChildren: depth-1 constraint application
 * - resolveInstanceLayout: strategy selection (derived vs constraint)
 */

import type { FigNode } from "@oxen/fig/types";
import { CONSTRAINT_TYPE_VALUES } from "@oxen/fig/constants";
import { resolveConstraintAxis } from "@oxen/fig/symbols";
import type { FigDerivedSymbolData } from "./symbol-resolver";

// =============================================================================
// Constraint value extraction
// =============================================================================

/**
 * Extract the numeric constraint value from a node's constraint field.
 * Returns CONSTRAINT_TYPE_VALUES.MIN (0) as default when unset.
 */
function getConstraintValue(constraintField: unknown): number {
  if (!constraintField || typeof constraintField !== "object") {
    return CONSTRAINT_TYPE_VALUES.MIN;
  }
  const val = (constraintField as { value?: number }).value;
  return val ?? CONSTRAINT_TYPE_VALUES.MIN;
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

    const hVal = getConstraintValue(nodeData.horizontalConstraint);
    const vVal = getConstraintValue(nodeData.verticalConstraint);

    // If both are MIN and no resize needed, skip
    if (
      hVal === CONSTRAINT_TYPE_VALUES.MIN &&
      vVal === CONSTRAINT_TYPE_VALUES.MIN &&
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

    const hResult = resolveConstraintAxis(origX, origW, symbolSize.x, instanceSize.x, hVal);
    const vResult = resolveConstraintAxis(origY, origH, symbolSize.y, instanceSize.y, vVal);

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

// =============================================================================
// Instance layout resolution
// =============================================================================

/**
 * Check whether derivedSymbolData entries reference GUIDs that actually
 * exist among the given children. Exported .fig files may carry
 * derivedSymbolData referencing external component library GUIDs that
 * don't exist in this file (orphaned entries).
 */
function isDerivedDataApplicable(
  derivedSymbolData: FigDerivedSymbolData,
  children: readonly FigNode[],
): boolean {
  return derivedSymbolData.some((entry) => {
    const firstGuid = entry.guidPath?.guids?.[0];
    if (!firstGuid) return false;
    const key = `${firstGuid.sessionID}:${firstGuid.localID}`;
    return children.some((child) => {
      const cg = (child as Record<string, unknown>).guid as
        | { sessionID: number; localID: number }
        | undefined;
      return cg != null && `${cg.sessionID}:${cg.localID}` === key;
    });
  });
}

/**
 * Clear fillGeometry/strokeGeometry on children whose size was changed by
 * derivedSymbolData, so the renderer falls back to size-based shape rendering.
 */
function clearDerivedGeometry(
  derivedSymbolData: FigDerivedSymbolData,
  children: readonly FigNode[],
): void {
  for (const entry of derivedSymbolData) {
    if (!entry.size) continue;
    const targetGuid =
      entry.guidPath?.guids?.[entry.guidPath.guids.length - 1];
    if (!targetGuid) continue;
    const targetKey = `${targetGuid.sessionID}:${targetGuid.localID}`;
    for (const child of children) {
      const cg = (child as Record<string, unknown>).guid as
        | { sessionID: number; localID: number }
        | undefined;
      if (cg && `${cg.sessionID}:${cg.localID}` === targetKey) {
        delete (child as Record<string, unknown>).fillGeometry;
        delete (child as Record<string, unknown>).strokeGeometry;
      }
    }
  }
}

/**
 * Result of instance layout resolution.
 */
export type InstanceLayoutResult = {
  /** Adjusted children array */
  readonly children: readonly FigNode[];
  /** Whether instance size should be applied to the merged node */
  readonly sizeApplied: boolean;
};

/**
 * Resolve layout for a resized INSTANCE's children.
 *
 * Strategy:
 * 1. If derivedSymbolData exists and its GUIDs match actual children,
 *    Figma has pre-computed the layout — use it as-is.
 * 2. Otherwise, fall back to constraint-based resolution.
 *
 * @param children           Cloned children (overrides already applied)
 * @param symbolSize         Original SYMBOL size
 * @param instanceSize       Actual INSTANCE size
 * @param derivedSymbolData  Pre-computed layout data (may be orphaned)
 */
export function resolveInstanceLayout(
  children: readonly FigNode[],
  symbolSize: { x: number; y: number },
  instanceSize: { x: number; y: number },
  derivedSymbolData: FigDerivedSymbolData | undefined,
): InstanceLayoutResult {
  // Strategy 1: derivedSymbolData with valid GUIDs
  if (derivedSymbolData && derivedSymbolData.length > 0) {
    if (isDerivedDataApplicable(derivedSymbolData, children)) {
      clearDerivedGeometry(derivedSymbolData, children);
      return { children, sizeApplied: true };
    }
  }

  // Strategy 2: constraint-based resolution
  const hasConstraints = children.some((child) => {
    const nd = child as Record<string, unknown>;
    const hc = nd.horizontalConstraint as { value?: number } | undefined;
    const vc = nd.verticalConstraint as { value?: number } | undefined;
    return (
      (hc?.value !== undefined && hc.value !== 0) ||
      (vc?.value !== undefined && vc.value !== 0)
    );
  });

  if (hasConstraints) {
    return {
      children: applyConstraintsToChildren(children, symbolSize, instanceSize),
      sizeApplied: true,
    };
  }

  // No derived data and no constraints: keep original layout
  return { children, sizeApplied: false };
}
