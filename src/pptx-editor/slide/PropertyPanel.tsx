/**
 * @file Property panel component
 *
 * Displays property editors for selected shapes.
 * Orchestrates shape-type-specific panels.
 */

import { useCallback, type CSSProperties } from "react";
import type { Shape } from "../../pptx/domain";
import type { Background, SlideTransition } from "../../pptx/domain/slide";
import { useSlideEditor } from "./context";
import { useSlideState } from "./hooks/useSlideState";
import { SlidePropertiesPanel } from "./property-panels/SlidePropertiesPanel";
import { MultiSelectState } from "./property-panels/MultiSelectState";
import { SpShapePanel } from "./property-panels/SpShapePanel";
import { PicShapePanel } from "./property-panels/PicShapePanel";
import { CxnShapePanel } from "./property-panels/CxnShapePanel";
import { GrpShapePanel } from "./property-panels/GrpShapePanel";
import { TableFramePanel } from "./property-panels/TableFramePanel";
import { ChartFramePanel } from "./property-panels/ChartFramePanel";
import { DiagramFramePanel } from "./property-panels/DiagramFramePanel";
import { OleFramePanel } from "./property-panels/OleFramePanel";
import { UnknownShapePanel } from "./property-panels/UnknownShapePanel";

// =============================================================================
// Types
// =============================================================================

export type PropertyPanelProps = {
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Render the appropriate panel for a shape.
 */
function renderShapePanel(
  shape: Shape,
  onShapeChange: (shape: Shape) => void,
  dispatch: ReturnType<typeof useSlideEditor>["dispatch"]
): React.ReactNode {
  switch (shape.type) {
    case "sp":
      return <SpShapePanel shape={shape} onChange={onShapeChange} />;
    case "pic":
      return <PicShapePanel shape={shape} onChange={onShapeChange} />;
    case "cxnSp":
      return <CxnShapePanel shape={shape} onChange={onShapeChange} />;
    case "grpSp":
      return (
        <GrpShapePanel
          shape={shape}
          onChange={onShapeChange}
          onUngroup={() =>
            dispatch({ type: "UNGROUP_SHAPE", shapeId: shape.nonVisual.id })
          }
          onSelectChild={(childId) =>
            dispatch({ type: "SELECT", shapeId: childId, addToSelection: false })
          }
        />
      );
    case "graphicFrame":
      return renderGraphicFramePanel(shape, onShapeChange);
    case "contentPart":
      return (
        <div
          style={{
            padding: "16px",
            color: "var(--editor-text-secondary, #888)",
            fontSize: "12px",
          }}
        >
          Content Part (external content reference)
        </div>
      );
    default:
      return <UnknownShapePanel shape={shape} />;
  }
}

/**
 * Render the appropriate panel for a GraphicFrame shape.
 */
function renderGraphicFramePanel(
  shape: Shape & { type: "graphicFrame" },
  onShapeChange: (shape: Shape) => void
): React.ReactNode {
  switch (shape.content.type) {
    case "table":
      return (
        <TableFramePanel
          shape={shape}
          table={shape.content.data.table}
          onChange={onShapeChange}
        />
      );
    case "chart":
      if (!shape.content.data.parsedChart) {
        return (
          <div
            style={{
              padding: "16px",
              color: "var(--editor-text-secondary, #888)",
              fontSize: "12px",
            }}
          >
            Chart data not loaded
          </div>
        );
      }
      return (
        <ChartFramePanel
          shape={shape}
          chart={shape.content.data.parsedChart}
          onChange={onShapeChange}
        />
      );
    case "diagram":
      return <DiagramFramePanel shape={shape} onChange={onShapeChange} />;
    case "oleObject":
      return <OleFramePanel shape={shape} onChange={onShapeChange} />;
    case "unknown":
      return <UnknownShapePanel shape={shape} />;
    default:
      return <UnknownShapePanel shape={shape} />;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Property panel for editing selected shape properties.
 *
 * Displays appropriate editors based on shape type:
 * - SpShape: NonVisual, Transform, Geometry, Fill, Line, Effects, Text
 * - PicShape: NonVisual, Transform, Crop (sourceRect), Stretch/Rotate, Effects
 * - CxnShape: NonVisual, Connections, Transform, Geometry, Line style, Effects
 * - GrpShape: NonVisual, Group info, Transform, Fill, Effects
 * - GraphicFrame (table): NonVisual, Transform, Table
 * - GraphicFrame (chart): NonVisual, Transform, Chart
 * - GraphicFrame (diagram): NonVisual, Transform, Diagram info
 * - GraphicFrame (oleObject): NonVisual, Transform, OLE Object info
 * - ContentPartShape: External content reference (read-only)
 */
export function PropertyPanel({ className, style }: PropertyPanelProps) {
  const { selectedShapes, primaryShape, slide, dispatch } = useSlideEditor();
  const { updateShape } = useSlideState();

  const handleShapeChange = useCallback(
    (newShape: Shape) => {
      const id = "nonVisual" in newShape ? newShape.nonVisual.id : undefined;
      if (id) {
        updateShape(id, () => newShape);
      }
    },
    [updateShape]
  );

  const handleBackgroundChange = useCallback(
    (background: Background | undefined) => {
      dispatch({
        type: "UPDATE_SLIDE",
        updater: (s) => ({ ...s, background }),
      });
    },
    [dispatch]
  );

  const handleTransitionChange = useCallback(
    (transition: SlideTransition | undefined) => {
      dispatch({
        type: "UPDATE_SLIDE",
        updater: (s) => ({ ...s, transition }),
      });
    },
    [dispatch]
  );

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    overflow: "auto",
    ...style,
  };

  // No selection - show slide properties
  if (selectedShapes.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <SlidePropertiesPanel
          background={slide.background}
          transition={slide.transition}
          onBackgroundChange={handleBackgroundChange}
          onTransitionChange={handleTransitionChange}
        />
      </div>
    );
  }

  // Multiple selection
  if (selectedShapes.length > 1) {
    return (
      <div className={className} style={containerStyle}>
        <MultiSelectState count={selectedShapes.length} />
      </div>
    );
  }

  // Single selection
  const shape = primaryShape;
  if (!shape) {
    // Fallback to slide properties if shape not found
    return (
      <div className={className} style={containerStyle}>
        <SlidePropertiesPanel
          background={slide.background}
          transition={slide.transition}
          onBackgroundChange={handleBackgroundChange}
          onTransitionChange={handleTransitionChange}
        />
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {renderShapePanel(shape, handleShapeChange, dispatch)}
    </div>
  );
}
