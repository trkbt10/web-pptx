/**
 * @file Slide drag-and-drop operations
 *
 * Pure functions for D&D logic. These can be tested without React.
 */

import type { SlideId, SlideWithId } from "../presentation/types";
import type { SlideDragState, SlideListOrientation } from "./types";
import { createIdleDragState } from "./types";

/**
 * Determine which slides to drag based on selection
 */
export function getDraggingIds(
  selectedIds: readonly SlideId[],
  draggedSlideId: SlideId
): readonly SlideId[] {
  // If dragging a selected item, drag all selected
  // If dragging unselected item, drag only that item
  return selectedIds.includes(draggedSlideId)
    ? [...selectedIds]
    : [draggedSlideId];
}

/**
 * Calculate drop position (before/after) based on cursor position
 */
export function getDropPosition(
  cursorPosition: number,
  elementStart: number,
  elementSize: number
): "before" | "after" {
  const mid = elementStart + elementSize / 2;
  return cursorPosition < mid ? "before" : "after";
}

/**
 * Calculate drop position for vertical orientation
 */
export function getVerticalDropPosition(
  clientY: number,
  rectTop: number,
  rectHeight: number
): "before" | "after" {
  return getDropPosition(clientY, rectTop, rectHeight);
}

/**
 * Calculate drop position for horizontal orientation
 */
export function getHorizontalDropPosition(
  clientX: number,
  rectLeft: number,
  rectWidth: number
): "before" | "after" {
  return getDropPosition(clientX, rectLeft, rectWidth);
}

/**
 * Calculate the target index for a drop operation
 */
export function calculateTargetIndex(
  slides: readonly SlideWithId[],
  draggingIds: readonly SlideId[],
  dropIndex: number,
  position: "before" | "after"
): number {
  // Start with the raw target index
  let targetIndex = position === "after" ? dropIndex + 1 : dropIndex;

  // Adjust for items being moved from before target
  const itemsMovingFromBefore = draggingIds.filter((id) => {
    const idx = slides.findIndex((s) => s.id === id);
    return idx >= 0 && idx < targetIndex;
  }).length;

  return targetIndex - itemsMovingFromBefore;
}

/**
 * Check if a drop is valid
 */
export function isValidDrop(
  dragState: SlideDragState,
  targetSlideId: SlideId
): boolean {
  // Can't drop if not dragging
  if (!dragState.isDragging) {
    return false;
  }

  // Can't drop if no slides being dragged
  if (dragState.draggingIds.length === 0) {
    return false;
  }

  // Can't drop on a slide that's being dragged
  if (dragState.draggingIds.includes(targetSlideId)) {
    return false;
  }

  return true;
}

/**
 * Create drag state for starting a drag operation
 */
export function createDragStartState(
  draggingIds: readonly SlideId[]
): SlideDragState {
  return {
    isDragging: true,
    draggingIds,
    targetPosition: null,
  };
}

/**
 * Update drag state for drag over
 */
export function updateDragOverState(
  currentState: SlideDragState,
  targetSlideId: SlideId,
  position: "before" | "after"
): SlideDragState {
  // Don't update if dragging over a slide being dragged
  if (currentState.draggingIds.includes(targetSlideId)) {
    return {
      ...currentState,
      targetPosition: null,
    };
  }

  return {
    ...currentState,
    targetPosition: { slideId: targetSlideId, position },
  };
}

/**
 * Check if a slide is a valid drag target
 */
export function isDragTarget(
  dragState: SlideDragState,
  slideId: SlideId
): boolean {
  return dragState.targetPosition?.slideId === slideId;
}

/**
 * Get the drag position for a slide (before/after indicator)
 */
export function getDragPositionForSlide(
  dragState: SlideDragState,
  slideId: SlideId
): "before" | "after" | null {
  if (dragState.targetPosition?.slideId === slideId) {
    return dragState.targetPosition.position;
  }
  return null;
}
