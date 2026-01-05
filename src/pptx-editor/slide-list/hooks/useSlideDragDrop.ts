/**
 * @file Slide drag-and-drop hook
 *
 * Manages multi-item drag-and-drop for slide reordering.
 * Uses gap-based targeting: indicator appears between slides, not on them.
 */

import { useCallback, useState } from "react";
import type { SlideId, SlideWithId } from "../../presentation/types";
import type { SlideDragState, SlideListOrientation } from "../types";
import { createIdleDragState } from "../types";
import {
  getDraggingIds,
  createDragStartState,
  updateDragOverGap,
  isValidGapDrop,
  calculateTargetIndexFromGap,
  isGapDragTarget,
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
  /** Handle drag start for a slide */
  readonly handleDragStart: (e: React.DragEvent, slideId: SlideId) => void;
  /** Handle drag over a gap */
  readonly handleGapDragOver: (e: React.DragEvent, gapIndex: number) => void;
  /** Handle drop on a gap */
  readonly handleGapDrop: (e: React.DragEvent, gapIndex: number) => void;
  /** Handle drag end */
  readonly handleDragEnd: () => void;
  /** Check if a slide is being dragged */
  readonly isDragging: (slideId: SlideId) => boolean;
  /** Check if a gap is the drag target */
  readonly isGapTarget: (gapIndex: number) => boolean;
};

/**
 * Hook for managing slide drag-and-drop with gap-based targeting
 */
export function useSlideDragDrop(
  options: UseSlideDragDropOptions
): UseSlideDragDropResult {
  const { slides, selectedIds, onMoveSlides } = options;

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

  const handleGapDragOver = useCallback(
    (e: React.DragEvent, gapIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragState((prev) => updateDragOverGap(prev, gapIndex));
    },
    []
  );

  const handleGapDrop = useCallback(
    (e: React.DragEvent, gapIndex: number) => {
      e.preventDefault();

      if (!isValidGapDrop(dragState, gapIndex, slides)) {
        setDragState(createIdleDragState());
        return;
      }

      const targetIndex = calculateTargetIndexFromGap(
        slides,
        dragState.draggingIds,
        gapIndex
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

  const isGapTarget = useCallback(
    (gapIndex: number) => isGapDragTarget(dragState, gapIndex),
    [dragState]
  );

  return {
    dragState,
    handleDragStart,
    handleGapDragOver,
    handleGapDrop,
    handleDragEnd,
    isDragging,
    isGapTarget,
  };
}
