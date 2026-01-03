/**
 * @file Drag move hook
 *
 * Handles drag-to-move behavior for shapes.
 */

import { useEffect } from "react";
import type { Pixels } from "../../../pptx/domain/types";
import { px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../context";
import { useSlideState } from "./useSlideState";
import { useClientToSlide } from "./useClientToSlide";

// =============================================================================
// Types
// =============================================================================

export type UseDragMoveOptions = {
  /** Slide width for coordinate conversion */
  readonly width: Pixels;
  /** Slide height for coordinate conversion */
  readonly height: Pixels;
  /** Container element ref for coordinate calculation */
  readonly containerRef: React.RefObject<HTMLElement | null>;
  /** Callback when drag completes */
  readonly onDragComplete?: () => void;
};

export type UseDragMoveResult = {
  /** Whether a move drag is active */
  readonly isDragging: boolean;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-move behavior.
 *
 * Listens for pointer events and updates shape transforms during drag.
 */
export function useDragMove({
  width,
  height,
  containerRef,
  onDragComplete,
}: UseDragMoveOptions): UseDragMoveResult {
  const { state, dispatch } = useSlideEditor();
  const { updateShapeTransform } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "move";

  // Use shared coordinate conversion hook
  const clientToSlide = useClientToSlide({ width, height, containerRef });

  // Handle pointer move during drag
  useEffect(() => {
    if (!isDragging || drag.type !== "move") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      const dx = pos.x - (drag.startX as number);
      const dy = pos.y - (drag.startY as number);

      // Update each dragged shape
      for (const shapeId of drag.shapeIds) {
        const initialBounds = drag.initialBounds.get(shapeId);
        if (!initialBounds) continue;

        updateShapeTransform(shapeId, {
          x: px(initialBounds.x + dx),
          y: px(initialBounds.y + dy),
        });
      }
    };

    const handlePointerUp = () => {
      dispatch({ type: "END_DRAG" });
      onDragComplete?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    isDragging,
    drag,
    dispatch,
    clientToSlide,
    updateShapeTransform,
    onDragComplete,
  ]);

  return { isDragging };
}
