/**
 * @file Text editing state for inline text editing
 *
 * Manages state for editing text within shapes.
 */

import type { TextBody } from "../../pptx/domain";
import type { ShapeId, Pixels } from "../../pptx/domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Bounds of the text editing area
 */
export type TextEditBounds = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly rotation: number; // degrees
};

/**
 * Inactive text edit state
 */
export type InactiveTextEditState = {
  readonly type: "inactive";
};

/**
 * Active text edit state
 */
export type ActiveTextEditState = {
  readonly type: "active";
  readonly shapeId: ShapeId;
  readonly bounds: TextEditBounds;
  readonly initialTextBody: TextBody;
};

/**
 * Text edit state union
 */
export type TextEditState = InactiveTextEditState | ActiveTextEditState;

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create inactive text edit state
 */
export function createInactiveTextEditState(): InactiveTextEditState {
  return { type: "inactive" };
}

/**
 * Create active text edit state
 */
export function createActiveTextEditState(
  shapeId: ShapeId,
  bounds: TextEditBounds,
  initialTextBody: TextBody
): ActiveTextEditState {
  return {
    type: "active",
    shapeId,
    bounds,
    initialTextBody,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if text edit state is inactive
 */
export function isTextEditInactive(
  state: TextEditState
): state is InactiveTextEditState {
  return state.type === "inactive";
}

/**
 * Check if text edit state is active
 */
export function isTextEditActive(
  state: TextEditState
): state is ActiveTextEditState {
  return state.type === "active";
}
