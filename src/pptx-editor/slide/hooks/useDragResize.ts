/**
 * @file Drag resize hook
 *
 * Handles drag-to-resize behavior for shapes.
 */

import { useCallback, useEffect } from "react";
import type { Pixels } from "../../../pptx/domain/types";
import { px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { useSlideState } from "./useSlideState";
import type { ResizeHandlePosition } from "../types";

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
// Helper Functions
// =============================================================================

/**
 * Calculate new bounds based on resize handle and delta
 */
function calculateNewBounds(
  handle: ResizeHandlePosition,
  initialBounds: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
  aspectLocked: boolean,
  minWidth: number,
  minHeight: number
): { x: number; y: number; width: number; height: number } {
  let { x, y, width, height } = initialBounds;
  const aspectRatio = initialBounds.width / initialBounds.height;

  // Calculate aspect-locked delta if needed
  const calcAspectDelta = (dw: number, dh: number): { dw: number; dh: number } => {
    if (!aspectLocked) return { dw, dh };

    // Use the larger delta to maintain aspect ratio
    const aspectDw = dh * aspectRatio;

    if (Math.abs(dw) > Math.abs(aspectDw)) {
      return { dw, dh: dw / aspectRatio };
    }
    return { dw: dh * aspectRatio, dh };
  };

  switch (handle) {
    case "nw": {
      const { dw, dh } = calcAspectDelta(-dx, -dy);
      const newWidth = Math.max(minWidth, initialBounds.width + dw);
      const newHeight = Math.max(minHeight, initialBounds.height + dh);
      x = initialBounds.x + initialBounds.width - newWidth;
      y = initialBounds.y + initialBounds.height - newHeight;
      width = newWidth;
      height = newHeight;
      break;
    }
    case "n": {
      const newHeight = Math.max(minHeight, initialBounds.height - dy);
      y = initialBounds.y + initialBounds.height - newHeight;
      height = newHeight;
      if (aspectLocked) {
        const newWidth = newHeight * aspectRatio;
        x = initialBounds.x + (initialBounds.width - newWidth) / 2;
        width = newWidth;
      }
      break;
    }
    case "ne": {
      const { dw, dh } = calcAspectDelta(dx, -dy);
      const newWidth = Math.max(minWidth, initialBounds.width + dw);
      const newHeight = Math.max(minHeight, initialBounds.height + dh);
      y = initialBounds.y + initialBounds.height - newHeight;
      width = newWidth;
      height = newHeight;
      break;
    }
    case "e": {
      const newWidth = Math.max(minWidth, initialBounds.width + dx);
      width = newWidth;
      if (aspectLocked) {
        const newHeight = newWidth / aspectRatio;
        y = initialBounds.y + (initialBounds.height - newHeight) / 2;
        height = newHeight;
      }
      break;
    }
    case "se": {
      const { dw, dh } = calcAspectDelta(dx, dy);
      width = Math.max(minWidth, initialBounds.width + dw);
      height = Math.max(minHeight, initialBounds.height + dh);
      break;
    }
    case "s": {
      const newHeight = Math.max(minHeight, initialBounds.height + dy);
      height = newHeight;
      if (aspectLocked) {
        const newWidth = newHeight * aspectRatio;
        x = initialBounds.x + (initialBounds.width - newWidth) / 2;
        width = newWidth;
      }
      break;
    }
    case "sw": {
      const { dw, dh } = calcAspectDelta(-dx, dy);
      const newWidth = Math.max(minWidth, initialBounds.width + dw);
      const newHeight = Math.max(minHeight, initialBounds.height + dh);
      x = initialBounds.x + initialBounds.width - newWidth;
      width = newWidth;
      height = newHeight;
      break;
    }
    case "w": {
      const newWidth = Math.max(minWidth, initialBounds.width - dx);
      x = initialBounds.x + initialBounds.width - newWidth;
      width = newWidth;
      if (aspectLocked) {
        const newHeight = newWidth / aspectRatio;
        y = initialBounds.y + (initialBounds.height - newHeight) / 2;
        height = newHeight;
      }
      break;
    }
  }

  return { x, y, width, height };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-resize behavior.
 *
 * Listens for pointer events and updates shape transforms during drag.
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
  const { updateShapeTransform } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "resize";

  // Convert client coordinates to slide coordinates
  const clientToSlide = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const scaleX = (width as number) / rect.width;
      const scaleY = (height as number) / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [width, height, containerRef]
  );

  // Handle pointer move during drag
  useEffect(() => {
    if (!isDragging || drag.type !== "resize") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      const dx = pos.x - (drag.startX as number);
      const dy = pos.y - (drag.startY as number);

      const newBounds = calculateNewBounds(
        drag.handle,
        {
          x: drag.initialBounds.x as number,
          y: drag.initialBounds.y as number,
          width: drag.initialBounds.width as number,
          height: drag.initialBounds.height as number,
        },
        dx,
        dy,
        drag.aspectLocked || e.shiftKey,
        minWidth,
        minHeight
      );

      updateShapeTransform(drag.shapeId, {
        x: px(newBounds.x),
        y: px(newBounds.y),
        width: px(newBounds.width),
        height: px(newBounds.height),
      });
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
    minWidth,
    minHeight,
    onDragComplete,
  ]);

  return { isDragging };
}
