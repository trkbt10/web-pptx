/**
 * @file Drag rotate hook
 *
 * Handles drag-to-rotate behavior for shapes.
 * Supports multi-selection rotation around combined center.
 */

import { useEffect } from "react";
import type { Pixels } from "../../../pptx/domain/types";
import { deg, px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../context";
import { useSlideState } from "./useSlideState";
import { useClientToSlide } from "./useClientToSlide";
import {
  normalizeAngle,
  snapAngle,
  rotateShapeAroundCenter,
  calculateRotationDelta,
  DEFAULT_SNAP_ANGLES,
  DEFAULT_SNAP_THRESHOLD,
} from "../shape/rotate";

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
// Hook
// =============================================================================

/**
 * Hook for handling drag-to-rotate behavior.
 *
 * Listens for pointer events and updates shape rotation during drag.
 * For multi-selection, rotates all shapes around the combined center.
 */
export function useDragRotate({
  width,
  height,
  containerRef,
  snapAngles = DEFAULT_SNAP_ANGLES,
  snapThreshold = DEFAULT_SNAP_THRESHOLD,
  onDragComplete,
}: UseDragRotateOptions): UseDragRotateResult {
  const { state, dispatch } = useSlideEditor();
  const { updateShapeTransform } = useSlideState();
  const { drag } = state;

  const isDragging = drag.type === "rotate";

  // Use shared coordinate conversion hook
  const clientToSlide = useClientToSlide({ width, height, containerRef });

  // Handle pointer move during drag
  useEffect(() => {
    if (!isDragging || drag.type !== "rotate") return;

    const handlePointerMove = (e: PointerEvent) => {
      const pos = clientToSlide(e.clientX, e.clientY);
      if (!pos) return;

      const centerX = drag.centerX as number;
      const centerY = drag.centerY as number;
      const startAngle = drag.startAngle as number;

      // Calculate rotation delta using extracted utility
      const deltaAngle = calculateRotationDelta(
        centerX,
        centerY,
        pos.x,
        pos.y,
        startAngle
      );

      const isMultiSelection = drag.shapeIds.length > 1;

      if (isMultiSelection) {
        // Multi-selection: rotate each shape around combined center
        for (const shapeId of drag.shapeIds) {
          const initialBounds = drag.initialBoundsMap.get(shapeId);
          const initialRotationDeg = drag.initialRotationsMap.get(shapeId);
          if (!initialBounds || initialRotationDeg === undefined) continue;

          // Use extracted rotation calculation
          const result = rotateShapeAroundCenter(
            initialBounds.x as number,
            initialBounds.y as number,
            initialBounds.width as number,
            initialBounds.height as number,
            initialRotationDeg as number,
            centerX,
            centerY,
            deltaAngle
          );

          // Apply snapping if shift is held
          const finalRotation = e.shiftKey
            ? snapAngle(result.rotation, snapAngles, snapThreshold)
            : result.rotation;

          updateShapeTransform(shapeId, {
            x: px(result.x),
            y: px(result.y),
            rotation: deg(finalRotation),
          });
        }
      } else {
        // Single selection: just rotate the shape
        let newRotation = normalizeAngle((drag.initialRotation as number) + deltaAngle);

        // Apply snapping if shift is held
        if (e.shiftKey) {
          newRotation = snapAngle(newRotation, snapAngles, snapThreshold);
        }

        updateShapeTransform(drag.shapeId, {
          rotation: deg(newRotation),
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
    snapAngles,
    snapThreshold,
    onDragComplete,
  ]);

  return { isDragging };
}
