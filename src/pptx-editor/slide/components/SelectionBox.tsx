/**
 * @file Selection box component
 *
 * Renders a bounding box around a selected shape.
 * Uses design tokens for consistent selection styling.
 */

import type { ResizeHandlePosition } from "../../state";
import { ResizeHandle } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";
import { colorTokens } from "../../ui/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type SelectionBoxProps = {
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Rotation in degrees */
  readonly rotation: number;
  /** Whether this is the primary selection */
  readonly isPrimary: boolean;
  /** Whether resize handles are shown */
  readonly showResizeHandles?: boolean;
  /** Whether rotate handle is shown */
  readonly showRotateHandle?: boolean;
  /** Handle resize start */
  readonly onResizeStart?: (handle: ResizeHandlePosition, e: React.PointerEvent) => void;
  /** Handle rotate start */
  readonly onRotateStart?: (e: React.PointerEvent) => void;
};

// =============================================================================
// Constants
// =============================================================================

const SELECTION_COLOR_PRIMARY = colorTokens.selection.primary;
const SELECTION_COLOR_SECONDARY = colorTokens.selection.secondary;
const SELECTION_STROKE_WIDTH = 2;
const ROTATE_HANDLE_OFFSET = 24;

// =============================================================================
// Component
// =============================================================================

/**
 * Selection box around a shape.
 *
 * Shows a bounding box with resize handles and rotation handle.
 */
export function SelectionBox({
  x,
  y,
  width,
  height,
  rotation,
  isPrimary,
  showResizeHandles = true,
  showRotateHandle = true,
  onResizeStart,
  onRotateStart,
}: SelectionBoxProps) {
  const color = isPrimary ? SELECTION_COLOR_PRIMARY : SELECTION_COLOR_SECONDARY;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const transform = rotation !== 0
    ? `rotate(${rotation}, ${centerX}, ${centerY})`
    : undefined;

  return (
    <g transform={transform}>
      {/* Bounding box */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={color}
        strokeWidth={SELECTION_STROKE_WIDTH}
        strokeDasharray={isPrimary ? "none" : "4 4"}
        pointerEvents="none"
      />

      {/* Resize handles */}
      {showResizeHandles && isPrimary && (
        <>
          {/* Corner handles */}
          <ResizeHandle
            position="nw"
            x={x}
            y={y}
            onPointerDown={(e) => onResizeStart?.("nw", e)}
          />
          <ResizeHandle
            position="ne"
            x={x + width}
            y={y}
            onPointerDown={(e) => onResizeStart?.("ne", e)}
          />
          <ResizeHandle
            position="se"
            x={x + width}
            y={y + height}
            onPointerDown={(e) => onResizeStart?.("se", e)}
          />
          <ResizeHandle
            position="sw"
            x={x}
            y={y + height}
            onPointerDown={(e) => onResizeStart?.("sw", e)}
          />

          {/* Edge handles */}
          <ResizeHandle
            position="n"
            x={x + width / 2}
            y={y}
            onPointerDown={(e) => onResizeStart?.("n", e)}
          />
          <ResizeHandle
            position="e"
            x={x + width}
            y={y + height / 2}
            onPointerDown={(e) => onResizeStart?.("e", e)}
          />
          <ResizeHandle
            position="s"
            x={x + width / 2}
            y={y + height}
            onPointerDown={(e) => onResizeStart?.("s", e)}
          />
          <ResizeHandle
            position="w"
            x={x}
            y={y + height / 2}
            onPointerDown={(e) => onResizeStart?.("w", e)}
          />
        </>
      )}

      {/* Rotate handle */}
      {showRotateHandle && isPrimary && (
        <>
          {/* Line from top center to rotate handle */}
          <line
            x1={x + width / 2}
            y1={y}
            x2={x + width / 2}
            y2={y - ROTATE_HANDLE_OFFSET}
            stroke={color}
            strokeWidth={1}
            pointerEvents="none"
          />
          <RotateHandle
            x={x + width / 2}
            y={y - ROTATE_HANDLE_OFFSET}
            onPointerDown={onRotateStart}
          />
        </>
      )}
    </g>
  );
}
