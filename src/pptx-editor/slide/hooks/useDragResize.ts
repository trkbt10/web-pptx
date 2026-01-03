/**
 * @file Drag resize hook
 *
 * Handles drag-to-resize behavior for shapes.
 * Supports multi-selection resize with proportional scaling.
 */

import { useEffect } from "react";
import type { Pixels } from "../../../pptx/domain/types";
import { px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../context";
import { useSlideState } from "./useSlideState";
import { useClientToSlide } from "./useClientToSlide";
import {
  calculateResizeBounds,
  calculateMultiResizeBounds,
  type ResizeBounds,
} from "../shape/resize";
import type { ShapeId } from "../types";

// =============================================================================
// Types
// =============================================================================

export type UseDragResizeOptions = {
  /** Slide width for coordinate conversion */
  readonly width: Pixels;
  /** Slide height for coordinate conversion */
  readonly height: Pixels;
  /** Container element ref for coordinate calculation */
  readonly containerRef: React.RefObject<HTMLElement | null>;
  /** Minimum shape width */
  readonly minWidth?: number;
  /** Minimum shape height */
  readonly minHeight?: number;
  /** Callback when drag completes */
  readonly onDragComplete?: () => void;
};

export type UseDragResizeResult = {
  /** Whether a resize drag is active */
  readonly isDragging: boolean;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-resize behavior.
 *
 * Listens for pointer events and updates shape transforms during drag.
 * For multi-selection, applies proportional scaling to all selected shapes.
 */
export function useDragResize({
  width,
  height,
  containerRef,
  minWidth = 10,
  minHeight = 10,
  onDragComplete,
}: UseDragResizeOptions): UseDragResizeResult {
  const { state, dispatch } = useSlideEditor();
  const { updateShapeTransform, updateMultipleShapeTransforms } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "resize";

  // Use shared coordinate conversion hook
  const clientToSlide = useClientToSlide({ width, height, containerRef });

  // Handle pointer move during drag
  useEffect(() => {
    if (!isDragging || drag.type !== "resize") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      const dx = pos.x - (drag.startX as number);
      const dy = pos.y - (drag.startY as number);
      const isMultiSelection = drag.shapeIds.length > 1;

      const resizeOptions = {
        aspectLocked: drag.aspectLocked || e.shiftKey,
        minWidth,
        minHeight,
      };

      if (isMultiSelection) {
        // Multi-selection resize: calculate new combined bounds, then scale each shape
        const combinedOld: ResizeBounds = {
          x: drag.combinedBounds.x as number,
          y: drag.combinedBounds.y as number,
          width: drag.combinedBounds.width as number,
          height: drag.combinedBounds.height as number,
        };

        const combinedNew = calculateResizeBounds(
          drag.handle,
          combinedOld,
          dx,
          dy,
          {
            ...resizeOptions,
            minWidth: minWidth * drag.shapeIds.length,
            minHeight: minHeight * drag.shapeIds.length,
          }
        );

        // Calculate and apply new bounds for each shape
        const updates: Array<{ id: ShapeId; bounds: { x: Pixels; y: Pixels; width: Pixels; height: Pixels } }> = [];
        for (const shapeId of drag.shapeIds) {
          const initialBounds = drag.initialBoundsMap.get(shapeId);
          if (!initialBounds) continue;

          const shapeBoundsOld: ResizeBounds = {
            x: initialBounds.x as number,
            y: initialBounds.y as number,
            width: initialBounds.width as number,
            height: initialBounds.height as number,
          };

          const shapeBoundsNew = calculateMultiResizeBounds(shapeBoundsOld, combinedOld, combinedNew);

          updates.push({
            id: shapeId,
            bounds: {
              x: px(shapeBoundsNew.x),
              y: px(shapeBoundsNew.y),
              width: px(Math.max(minWidth, shapeBoundsNew.width)),
              height: px(Math.max(minHeight, shapeBoundsNew.height)),
            },
          });
        }

        updateMultipleShapeTransforms(updates);
      } else {
        // Single selection resize
        const initialBounds: ResizeBounds = {
          x: drag.initialBounds.x as number,
          y: drag.initialBounds.y as number,
          width: drag.initialBounds.width as number,
          height: drag.initialBounds.height as number,
        };

        const newBounds = calculateResizeBounds(
          drag.handle,
          initialBounds,
          dx,
          dy,
          resizeOptions
        );

        updateShapeTransform(drag.shapeId, {
          x: px(newBounds.x),
          y: px(newBounds.y),
          width: px(newBounds.width),
          height: px(newBounds.height),
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
    updateMultipleShapeTransforms,
    minWidth,
    minHeight,
    onDragComplete,
  ]);

  return { isDragging };
}
