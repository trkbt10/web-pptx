/**
 * @file Slide editor component
 *
 * Main component that integrates all slide editing functionality.
 * Fully controlled component - receives all state and dispatch as props.
 */

import { useRef, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import type { RenderContext } from "../../pptx/render/context";
import type { SlideEditorState, SlideEditorAction } from "./types";
import type { SelectionState, DragState, ResizeHandlePosition } from "../state";
import type { ContextMenuActions } from "./context-menu/SlideContextMenu";
import { renderSlideSvg } from "../../pptx/render/svg/renderer";
import { SlideCanvas } from "./SlideCanvas";
import { ShapeSelector } from "./ShapeSelector";
import { PropertyPanel } from "./PropertyPanel";
import { ShapeToolbar } from "./ShapeToolbar";
import { LayerPanel } from "./LayerPanel";
import { Panel } from "../ui/layout";
import { findShapeById } from "../shape/query";
import { isTopLevelShape } from "../shape/query";
import { clientToSlideCoords } from "../shape/coords";
import { getShapeTransform, withUpdatedTransform } from "../shape/transform";
import { calculateAlignedBounds } from "../shape/alignment";

// =============================================================================
// Types
// =============================================================================

export type SlideEditorProps = {
  /** Editor state */
  readonly state: SlideEditorState;
  /** Dispatch action */
  readonly dispatch: (action: SlideEditorAction) => void;
  /** Current slide (convenience, derived from state) */
  readonly slide: Slide;
  /** Selected shapes (convenience, derived from state) */
  readonly selectedShapes: readonly Shape[];
  /** Primary selected shape (convenience, derived from state) */
  readonly primaryShape: Shape | undefined;
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
  /** Slide width */
  readonly width: Pixels;
  /** Slide height */
  readonly height: Pixels;
  /** Pre-rendered SVG content (takes precedence over renderContext) */
  readonly svgContent?: string;
  /**
   * Render context for integrated SVG rendering.
   * When provided, the editor will automatically re-render the slide to SVG on changes.
   */
  readonly renderContext?: RenderContext;
  /** Show property panel */
  readonly showPropertyPanel?: boolean;
  /** Show layer panel (shape hierarchy) */
  readonly showLayerPanel?: boolean;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** Property panel position */
  readonly propertyPanelPosition?: "left" | "right";
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Apply move delta to shapes during drag
 */
function applyMoveDelta(
  slide: Slide,
  drag: DragState,
  deltaX: number,
  deltaY: number,
  dispatch: (action: SlideEditorAction) => void
): void {
  if (drag.type !== "move") return;

  for (const shapeId of drag.shapeIds) {
    const initialBounds = drag.initialBounds.get(shapeId);
    if (!initialBounds) continue;

    dispatch({
      type: "UPDATE_SHAPE",
      shapeId,
      updater: (shape) =>
        withUpdatedTransform(shape, {
          x: px(initialBounds.x + deltaX),
          y: px(initialBounds.y + deltaY),
        }),
    });
  }
}

/**
 * Apply resize delta to shapes during drag
 */
function applyResizeDelta(
  slide: Slide,
  drag: DragState,
  deltaX: number,
  deltaY: number,
  dispatch: (action: SlideEditorAction) => void
): void {
  if (drag.type !== "resize") return;

  const { handle, combinedBounds, initialBoundsMap } = drag;
  if (!combinedBounds || !initialBoundsMap) return;

  // Calculate new combined bounds (use plain numbers for arithmetic)
  let newCombinedBounds = {
    x: combinedBounds.x as number,
    y: combinedBounds.y as number,
    width: combinedBounds.width as number,
    height: combinedBounds.height as number,
  };
  const aspect = (combinedBounds.width as number) / (combinedBounds.height as number);

  // Use base values for arithmetic
  const baseX = combinedBounds.x as number;
  const baseY = combinedBounds.y as number;
  const baseW = combinedBounds.width as number;
  const baseH = combinedBounds.height as number;

  // Apply deltas based on handle
  switch (handle) {
    case "nw":
      newCombinedBounds = {
        x: baseX + deltaX,
        y: baseY + deltaY,
        width: baseW - deltaX,
        height: baseH - deltaY,
      };
      break;
    case "n":
      newCombinedBounds = {
        ...newCombinedBounds,
        y: baseY + deltaY,
        height: baseH - deltaY,
      };
      break;
    case "ne":
      newCombinedBounds = {
        ...newCombinedBounds,
        y: baseY + deltaY,
        width: baseW + deltaX,
        height: baseH - deltaY,
      };
      break;
    case "e":
      newCombinedBounds = {
        ...newCombinedBounds,
        width: baseW + deltaX,
      };
      break;
    case "se":
      newCombinedBounds = {
        ...newCombinedBounds,
        width: baseW + deltaX,
        height: baseH + deltaY,
      };
      break;
    case "s":
      newCombinedBounds = {
        ...newCombinedBounds,
        height: baseH + deltaY,
      };
      break;
    case "sw":
      newCombinedBounds = {
        ...newCombinedBounds,
        x: baseX + deltaX,
        width: baseW - deltaX,
        height: baseH + deltaY,
      };
      break;
    case "w":
      newCombinedBounds = {
        ...newCombinedBounds,
        x: baseX + deltaX,
        width: baseW - deltaX,
      };
      break;
  }

  // Clamp to minimum size
  newCombinedBounds.width = Math.max(10, newCombinedBounds.width);
  newCombinedBounds.height = Math.max(10, newCombinedBounds.height);

  // Apply aspect lock if needed
  if (drag.aspectLocked) {
    if (handle === "n" || handle === "s") {
      newCombinedBounds.width = newCombinedBounds.height * aspect;
    } else if (handle === "e" || handle === "w") {
      newCombinedBounds.height = newCombinedBounds.width / aspect;
    } else {
      // Corner handles - use width as reference
      newCombinedBounds.height = newCombinedBounds.width / aspect;
    }
  }

  // Calculate scale factors
  const scaleX = newCombinedBounds.width / baseW;
  const scaleY = newCombinedBounds.height / baseH;

  // Apply to each shape
  for (const shapeId of drag.shapeIds) {
    const initialBounds = initialBoundsMap.get(shapeId);
    if (!initialBounds) continue;

    // Scale relative to combined bounds origin
    const relX = (initialBounds.x as number) - baseX;
    const relY = (initialBounds.y as number) - baseY;
    const newX = newCombinedBounds.x + relX * scaleX;
    const newY = newCombinedBounds.y + relY * scaleY;
    const newWidth = (initialBounds.width as number) * scaleX;
    const newHeight = (initialBounds.height as number) * scaleY;

    dispatch({
      type: "UPDATE_SHAPE",
      shapeId,
      updater: (shape) =>
        withUpdatedTransform(shape, {
          x: px(newX),
          y: px(newY),
          width: px(newWidth),
          height: px(newHeight),
        }),
    });
  }
}

/**
 * Apply rotation delta to shapes during drag
 */
function applyRotateDelta(
  slide: Slide,
  drag: DragState,
  currentAngle: number,
  dispatch: (action: SlideEditorAction) => void
): void {
  if (drag.type !== "rotate") return;

  const { startAngle, initialRotationsMap, shapeIds } = drag;
  const angleDelta = currentAngle - (startAngle as number);

  for (const shapeId of shapeIds) {
    const initialRotation = initialRotationsMap?.get(shapeId);
    if (initialRotation === undefined) continue;

    let newRotation = ((initialRotation as number) + angleDelta) % 360;
    if (newRotation < 0) newRotation += 360;

    dispatch({
      type: "UPDATE_SHAPE",
      shapeId,
      updater: (shape) =>
        withUpdatedTransform(shape, {
          rotation: deg(newRotation),
        }),
    });
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Slide editor with canvas, property panel, and toolbar.
 *
 * Fully controlled component - all state comes from props.
 */
export function SlideEditor({
  state,
  dispatch,
  slide,
  selectedShapes,
  primaryShape,
  canUndo,
  canRedo,
  width,
  height,
  svgContent: externalSvgContent,
  renderContext,
  showPropertyPanel = true,
  showLayerPanel = true,
  showToolbar = true,
  propertyPanelPosition = "right",
  className,
  style,
}: SlideEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selection, drag } = state;

  // Integrated SVG rendering: re-render when slide changes
  const renderedSvgContent = useMemo(() => {
    if (externalSvgContent !== undefined) {
      return externalSvgContent;
    }
    if (renderContext !== undefined) {
      const result = renderSlideSvg(slide, renderContext);
      return result.svg;
    }
    return undefined;
  }, [slide, externalSvgContent, renderContext]);

  // ==========================================================================
  // Drag handlers (move, resize, rotate)
  // ==========================================================================

  useEffect(() => {
    if (drag.type === "idle") return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

      if (drag.type === "move") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        applyMoveDelta(slide, drag, deltaX, deltaY, dispatch);
      } else if (drag.type === "resize") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        applyResizeDelta(slide, drag, deltaX, deltaY, dispatch);
      } else if (drag.type === "rotate") {
        const centerX = drag.centerX as number;
        const centerY = drag.centerY as number;
        const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI);
        applyRotateDelta(slide, drag, currentAngle, dispatch);
      }
    };

    const handlePointerUp = () => {
      dispatch({ type: "END_DRAG" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, slide, width, height, dispatch]);

  // ==========================================================================
  // Keyboard shortcuts
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo/Redo
      if (modKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if (modKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      // Copy/Paste
      if (modKey && e.key === "c") {
        e.preventDefault();
        dispatch({ type: "COPY" });
        return;
      }
      if (modKey && e.key === "v") {
        e.preventDefault();
        dispatch({ type: "PASTE" });
        return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds });
        return;
      }

      // Duplicate
      if (modKey && e.key === "d") {
        e.preventDefault();
        dispatch({ type: "COPY" });
        dispatch({ type: "PASTE" });
        return;
      }

      // Select all
      if (modKey && e.key === "a") {
        e.preventDefault();
        const allIds = slide.shapes
          .filter((s): s is Shape & { nonVisual: { id: ShapeId } } => "nonVisual" in s)
          .map((s) => s.nonVisual.id);
        dispatch({ type: "SELECT_MULTIPLE", shapeIds: allIds });
        return;
      }

      // Group/Ungroup
      if (modKey && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        if (selection.selectedIds.length >= 2) {
          dispatch({ type: "GROUP_SHAPES", shapeIds: selection.selectedIds });
        }
        return;
      }
      if (modKey && e.shiftKey && e.key === "g") {
        e.preventDefault();
        if (selection.primaryId && primaryShape?.type === "grpSp") {
          dispatch({ type: "UNGROUP_SHAPE", shapeId: selection.primaryId });
        }
        return;
      }

      // Escape to deselect
      if (e.key === "Escape") {
        dispatch({ type: "CLEAR_SELECTION" });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, selection, slide, primaryShape]);

  // ==========================================================================
  // Context menu actions
  // ==========================================================================

  const canGroup = useMemo(() => {
    if (selection.selectedIds.length < 2) return false;
    return selection.selectedIds.every((id) => isTopLevelShape(slide.shapes, id));
  }, [selection.selectedIds, slide.shapes]);

  const canUngroup = useMemo(() => {
    if (selection.selectedIds.length !== 1) return false;
    return primaryShape?.type === "grpSp";
  }, [selection.selectedIds, primaryShape]);

  const hasSelection = selection.selectedIds.length > 0;
  const isMultiSelect = selection.selectedIds.length > 1;
  const canAlign = selection.selectedIds.length >= 2;
  const canDistribute = selection.selectedIds.length >= 3;
  const hasClipboard = state.clipboard !== undefined && state.clipboard.shapes.length > 0;

  const contextMenuActions: ContextMenuActions = useMemo(() => ({
    // State flags
    hasSelection,
    hasClipboard,
    isMultiSelect,
    canGroup,
    canUngroup,
    canAlign,
    canDistribute,
    // Actions
    copy: () => dispatch({ type: "COPY" }),
    cut: () => {
      dispatch({ type: "COPY" });
      dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds });
    },
    paste: () => dispatch({ type: "PASTE" }),
    duplicateSelected: () => {
      dispatch({ type: "COPY" });
      dispatch({ type: "PASTE" });
    },
    deleteSelected: () => dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds }),
    bringToFront: () => {
      if (selection.primaryId) {
        dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "front" });
      }
    },
    bringForward: () => {
      if (selection.primaryId) {
        dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "forward" });
      }
    },
    sendBackward: () => {
      if (selection.primaryId) {
        dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "backward" });
      }
    },
    sendToBack: () => {
      if (selection.primaryId) {
        dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "back" });
      }
    },
    group: () => {
      if (canGroup) {
        dispatch({ type: "GROUP_SHAPES", shapeIds: selection.selectedIds });
      }
    },
    ungroup: () => {
      if (canUngroup && selection.primaryId) {
        dispatch({ type: "UNGROUP_SHAPE", shapeId: selection.primaryId });
      }
    },
    alignLeft: () => applyAlignment("left"),
    alignCenter: () => applyAlignment("center"),
    alignRight: () => applyAlignment("right"),
    alignTop: () => applyAlignment("top"),
    alignMiddle: () => applyAlignment("middle"),
    alignBottom: () => applyAlignment("bottom"),
    distributeHorizontally: () => applyAlignment("distributeH"),
    distributeVertically: () => applyAlignment("distributeV"),
  }), [dispatch, selection, canGroup, canUngroup, hasSelection, hasClipboard, isMultiSelect, canAlign, canDistribute]);

  // Alignment helper
  const applyAlignment = useCallback((alignment: string) => {
    if (selection.selectedIds.length < 2) return;

    const alignedBounds = calculateAlignedBounds(
      slide.shapes,
      selection.selectedIds,
      alignment as "left" | "center" | "right" | "top" | "middle" | "bottom" | "distributeH" | "distributeV"
    );

    for (const [shapeId, bounds] of alignedBounds) {
      dispatch({
        type: "UPDATE_SHAPE",
        shapeId,
        updater: (shape) =>
          withUpdatedTransform(shape, {
            x: px(bounds.x),
            y: px(bounds.y),
          }),
      });
    }
  }, [dispatch, selection.selectedIds, slide.shapes]);

  // ==========================================================================
  // Callbacks for child components
  // ==========================================================================

  const handleShapeChange = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    [dispatch]
  );

  const handleSlideChange = useCallback(
    (updater: (slide: Slide) => Slide) => {
      dispatch({ type: "UPDATE_SLIDE", updater });
    },
    [dispatch]
  );

  const handleSelect = useCallback(
    (shapeId: ShapeId, addToSelection: boolean = false) => {
      dispatch({ type: "SELECT", shapeId, addToSelection });
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "DELETE_SHAPES", shapeIds });
    },
    [dispatch]
  );

  const handleDuplicate = useCallback(() => {
    dispatch({ type: "COPY" });
    dispatch({ type: "PASTE" });
  }, [dispatch]);

  const handleReorder = useCallback(
    (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => {
      dispatch({ type: "REORDER_SHAPE", shapeId, direction });
    },
    [dispatch]
  );

  const handleGroup = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "GROUP_SHAPES", shapeIds });
    },
    [dispatch]
  );

  const handleUngroup = useCallback(
    (shapeId: ShapeId) => {
      dispatch({ type: "UNGROUP_SHAPE", shapeId });
    },
    [dispatch]
  );

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, [dispatch]);

  // ==========================================================================
  // Styles
  // ==========================================================================

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: propertyPanelPosition === "right" ? "row" : "row-reverse",
    gap: "16px",
    height: "100%",
    ...style,
  };

  const canvasAreaStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  };

  const canvasContainerStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--editor-canvas-bg, #1a1a1a)",
    borderRadius: "var(--radius-md, 8px)",
    padding: "24px",
  };

  const aspectRatio = (width as number) / (height as number);
  const canvasWrapperStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: `calc((100vh - 200px) * ${aspectRatio})`,
    aspectRatio: `${width} / ${height}`,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
    backgroundColor: "white",
  };

  const toolbarStyle: CSSProperties = {
    backgroundColor: "var(--editor-panel-bg, #0a0a0a)",
    borderRadius: "var(--radius-md, 8px)",
    border: "1px solid var(--editor-border, #222)",
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Layer Panel (left side) */}
      {showLayerPanel && propertyPanelPosition === "right" && (
        <Panel title="Layers" badge={slide.shapes.length}>
          <LayerPanel
            slide={slide}
            selection={selection}
            primaryShape={primaryShape}
            onSelect={handleSelect}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onClearSelection={handleClearSelection}
          />
        </Panel>
      )}

      {/* Property Panel */}
      {showPropertyPanel && (
        <Panel title="Properties">
          <PropertyPanel
            slide={slide}
            selectedShapes={selectedShapes}
            primaryShape={primaryShape}
            onShapeChange={handleShapeChange}
            onSlideChange={handleSlideChange}
            onUngroup={handleUngroup}
            onSelect={(id) => handleSelect(id, false)}
          />
        </Panel>
      )}

      {/* Canvas Area */}
      <div style={canvasAreaStyle}>
        {/* Toolbar */}
        {showToolbar && (
          <div style={toolbarStyle}>
            <ShapeToolbar
              canUndo={canUndo}
              canRedo={canRedo}
              selectedIds={selection.selectedIds}
              primaryShape={primaryShape}
              onUndo={() => dispatch({ type: "UNDO" })}
              onRedo={() => dispatch({ type: "REDO" })}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onReorder={handleReorder}
              onShapeChange={handleShapeChange}
              direction="horizontal"
            />
          </div>
        )}

        {/* Canvas */}
        <div style={canvasContainerStyle}>
          <div ref={containerRef} style={canvasWrapperStyle}>
            <SlideCanvas
              slide={slide}
              selection={selection}
              drag={drag}
              dispatch={dispatch}
              svgContent={renderedSvgContent}
              width={width}
              height={height}
              primaryShape={primaryShape}
              selectedShapes={selectedShapes}
              contextMenuActions={contextMenuActions}
            />
            <ShapeSelector
              slide={slide}
              selection={selection}
              dispatch={dispatch}
              width={width}
              height={height}
            />
          </div>
        </div>
      </div>

      {/* Layer Panel (right side, after canvas) */}
      {showLayerPanel && propertyPanelPosition === "left" && (
        <Panel title="Layers" badge={slide.shapes.length}>
          <LayerPanel
            slide={slide}
            selection={selection}
            primaryShape={primaryShape}
            onSelect={handleSelect}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onClearSelection={handleClearSelection}
          />
        </Panel>
      )}
    </div>
  );
}
