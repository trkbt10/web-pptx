/**
 * @file Shape selector component
 *
 * Renders selection UI for selected shapes.
 */

import { useCallback, useMemo } from "react";
import type { Pixels } from "../../pptx/domain/types";
import { getShapeTransform } from "../../pptx/render/svg/slide-utils";
import { useSlideEditor } from "../context/SlideEditorContext";
import { SelectionBox } from "./components/SelectionBox";
import type { ResizeHandlePosition, ShapeId } from "./types";

// =============================================================================
// Types
// =============================================================================

export type ShapeSelectorProps = {
  /** Slide width */
  readonly width: Pixels;
  /** Slide height */
  readonly height: Pixels;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Shape selector - renders selection boxes for selected shapes.
 *
 * This component should be rendered as an overlay on the slide canvas.
 */
export function ShapeSelector({ width, height }: ShapeSelectorProps) {
  const { selectedShapes, state, dispatch } = useSlideEditor();
  const { selection } = state;

  // Get bounds for selected shapes
  const selectedBounds = useMemo(() => {
    const bounds: Array<{
      id: ShapeId;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      isPrimary: boolean;
    }> = [];

    for (const shape of selectedShapes) {
      const transform = getShapeTransform(shape);
      if (!transform) continue;

      const id = "nonVisual" in shape ? shape.nonVisual.id : undefined;
      if (!id) continue;

      bounds.push({
        id,
        x: transform.x as number,
        y: transform.y as number,
        width: transform.width as number,
        height: transform.height as number,
        rotation: transform.rotation as number,
        isPrimary: id === selection.primaryId,
      });
    }

    return bounds;
  }, [selectedShapes, selection.primaryId]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const scaleX = (width as number) / rect.width;
      const scaleY = (height as number) / rect.height;
      const startX = (e.clientX - rect.left) * scaleX;
      const startY = (e.clientY - rect.top) * scaleY;

      dispatch({
        type: "START_RESIZE",
        handle,
        startX: startX as Pixels,
        startY: startY as Pixels,
        aspectLocked: e.shiftKey,
      });
    },
    [dispatch, width, height]
  );

  // Handle rotate start
  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const scaleX = (width as number) / rect.width;
      const scaleY = (height as number) / rect.height;
      const startX = (e.clientX - rect.left) * scaleX;
      const startY = (e.clientY - rect.top) * scaleY;

      dispatch({
        type: "START_ROTATE",
        startX: startX as Pixels,
        startY: startY as Pixels,
      });
    },
    [dispatch, width, height]
  );

  if (selectedBounds.length === 0) {
    return null;
  }

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g style={{ pointerEvents: "auto" }}>
        {selectedBounds.map((bounds) => (
          <SelectionBox
            key={bounds.id}
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            rotation={bounds.rotation}
            isPrimary={bounds.isPrimary}
            showResizeHandles={bounds.isPrimary}
            showRotateHandle={bounds.isPrimary}
            onResizeStart={handleResizeStart}
            onRotateStart={handleRotateStart}
          />
        ))}
      </g>
    </svg>
  );
}
