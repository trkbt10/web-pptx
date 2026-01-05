/**
 * @file Slide drag-and-drop hook
 *
 * Manages multi-item drag-and-drop for slide reordering.
 * Uses pure functions from drag-drop.ts for testable logic.
 */

import { useCallback, useState } from "react";
import type { SlideId, SlideWithId } from "../../presentation/types";
import type { SlideDragState, SlideListOrientation } from "../types";
import { createIdleDragState } from "../types";
import {
  getDraggingIds,
  getVerticalDropPosition,
  getHorizontalDropPosition,
  calculateTargetIndex,
  isValidDrop,
  createDragStartState,
  updateDragOverState,
  isDragTarget as isDragTargetFn,
  getDragPositionForSlide,
} from "../drag-drop";

export type UseSlideDragDropOptions = {
  /** Slides array */
  readonly slides: readonly SlideWithId[];
  /** Currently selected slide IDs */
  readonly selectedIds: readonly SlideId[];
  /** Scroll orientation */
  readonly orientation: SlideListOrientation;
  /** Called when slides are moved */
  readonly onMoveSlides?: (
    slideIds: readonly SlideId[],
    toIndex: number
  ) => void;
};

export type UseSlideDragDropResult = {
  /** Current drag state */
  readonly dragState: SlideDragState;
  /** Create drag start handler for a slide */
  readonly handleDragStart: (
    e: React.DragEvent,
    slideId: SlideId
  ) => void;
  /** Create drag over handler for a slide */
  readonly handleDragOver: (
    e: React.DragEvent,
    slideId: SlideId,
    index: number
  ) => void;
  /** Create drop handler for a slide */
  readonly handleDrop: (
    e: React.DragEvent,
    slideId: SlideId,
    index: number
  ) => void;
  /** Handle drag end */
  readonly handleDragEnd: () => void;
  /** Check if a slide is being dragged */
  readonly isDragging: (slideId: SlideId) => boolean;
  /** Check if a slide is a drag target */
  readonly isDragTarget: (slideId: SlideId) => boolean;
  /** Get drag position for a slide */
  readonly getDragPosition: (slideId: SlideId) => "before" | "after" | null;
};

/**
 * Hook for managing slide drag-and-drop
 */
export function useSlideDragDrop(
  options: UseSlideDragDropOptions
): UseSlideDragDropResult {
  const { slides, selectedIds, orientation, onMoveSlides } = options;

  const [dragState, setDragState] = useState<SlideDragState>(
    createIdleDragState()
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, slideId: SlideId) => {
      const draggingIds = getDraggingIds(selectedIds, slideId);

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/slide-ids",
        JSON.stringify(draggingIds)
      );

      setDragState(createDragStartState(draggingIds));
    },
    [selectedIds]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, slideId: SlideId, _index: number) => {
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      const position =
        orientation === "vertical"
          ? getVerticalDropPosition(e.clientY, rect.top, rect.height)
          : getHorizontalDropPosition(e.clientX, rect.left, rect.width);

      setDragState((prev) => updateDragOverState(prev, slideId, position));
    },
    [orientation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, slideId: SlideId, index: number) => {
      e.preventDefault();

      if (!isValidDrop(dragState, slideId)) {
        setDragState(createIdleDragState());
        return;
      }

      const position = dragState.targetPosition?.position ?? "before";
      const targetIndex = calculateTargetIndex(
        slides,
        dragState.draggingIds,
        index,
        position
      );

      onMoveSlides?.(dragState.draggingIds, targetIndex);
      setDragState(createIdleDragState());
    },
    [dragState, slides, onMoveSlides]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(createIdleDragState());
  }, []);

  const isDragging = useCallback(
    (slideId: SlideId) => dragState.draggingIds.includes(slideId),
    [dragState.draggingIds]
  );

  const isDragTarget = useCallback(
    (slideId: SlideId) => isDragTargetFn(dragState, slideId),
    [dragState]
  );

  const getDragPosition = useCallback(
    (slideId: SlideId): "before" | "after" | null => {
      return getDragPositionForSlide(dragState, slideId);
    },
    [dragState]
  );

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragging,
    isDragTarget,
    getDragPosition,
  };
}
