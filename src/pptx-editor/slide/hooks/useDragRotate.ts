/**
 * @file Drag rotate hook
 *
 * Handles drag-to-rotate behavior for shapes.
 */

import { useCallback, useEffect } from "react";
import type { Pixels } from "../../../pptx/domain/types";
import { deg } from "../../../pptx/domain/types";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { useSlideState } from "./useSlideState";

// =============================================================================
// Types
// =============================================================================

export type UseDragRotateOptions = {
  /** Slide width for coordinate conversion */
  readonly width: Pixels;
  /** Slide height for coordinate conversion */
  readonly height: Pixels;
  /** Container element ref for coordinate calculation */
  readonly containerRef: React.RefObject<HTMLElement | null>;
  /** Snap angles (e.g., [0, 45, 90, 135, 180, 225, 270, 315]) */
  readonly snapAngles?: readonly number[];
  /** Snap threshold in degrees */
  readonly snapThreshold?: number;
  /** Callback when drag completes */
  readonly onDragComplete?: () => void;
};

export type UseDragRotateResult = {
  /** Whether a rotate drag is active */
  readonly isDragging: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Snap angle to nearest snap point if within threshold
 */
function snapAngle(
  angle: number,
  snapAngles: readonly number[],
  threshold: number
): number {
  for (const snapAngle of snapAngles) {
    const diff = Math.abs(normalizeAngle(angle - snapAngle));
    if (diff < threshold || diff > 360 - threshold) {
      return snapAngle;
    }
  }
  return angle;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-rotate behavior.
 *
 * Listens for pointer events and updates shape rotation during drag.
 */
export function useDragRotate({
  width,
  height,
  containerRef,
  snapAngles = [0, 45, 90, 135, 180, 225, 270, 315],
  snapThreshold = 5,
  onDragComplete,
}: UseDragRotateOptions): UseDragRotateResult {
  const { state, dispatch } = useSlideEditor();
  const { updateShapeTransform } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "rotate";

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
    if (!isDragging || drag.type !== "rotate") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      // Calculate angle from center to current position
      const centerX = drag.centerX as number;
      const centerY = drag.centerY as number;
      const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * (180 / Math.PI);

      // Calculate rotation delta
      const startAngle = drag.startAngle as number;
      const deltaAngle = currentAngle - startAngle;

      // Calculate new rotation
      let newRotation = normalizeAngle((drag.initialRotation as number) + deltaAngle);

      // Apply snapping if shift is held
      if (e.shiftKey) {
        newRotation = snapAngle(newRotation, snapAngles, snapThreshold);
      }

      updateShapeTransform(drag.shapeId, {
        rotation: deg(newRotation),
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
    snapAngles,
    snapThreshold,
    onDragComplete,
  ]);

  return { isDragging };
}
