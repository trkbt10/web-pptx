/**
 * @file Slide canvas component
 *
 * Renders a slide with interactive shape selection.
 * Uses an overlay pattern to add interactivity on top of SVG rendering.
 */

import { useCallback, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import type { Pixels } from "../../pptx/domain/types";
import { useSlideEditor } from "../context/SlideEditorContext";
import { clientToSlideCoords } from "../utils";
import { useSelection } from "./hooks/useSelection";
import { collectShapeRenderData } from "./shape";
import { SlideContextMenu } from "./context-menu";
import type { ShapeId } from "./types";

// =============================================================================
// Types
// =============================================================================

export type SlideCanvasProps = {
  /** Pre-rendered SVG content (if not using render function) */
  readonly svgContent?: string;
  /** Slide dimensions */
  readonly width: Pixels;
  readonly height: Pixels;
  /** Whether to show shape hit areas (for debugging) */
  readonly debugHitAreas?: boolean;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Helper Functions
// =============================================================================

function getRotationTransform(
  rotation: number,
  x: number,
  y: number,
  width: number,
  height: number
): string | undefined {
  if (rotation === 0) {
    return undefined;
  }
  return `rotate(${rotation}, ${x + width / 2}, ${y + height / 2})`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Slide canvas with interactive shape selection.
 *
 * Renders the slide SVG with an overlay for shape interaction.
 */
export function SlideCanvas({
  svgContent,
  width,
  height,
  debugHitAreas = false,
  className,
  style,
}: SlideCanvasProps) {
  const { slide, state, dispatch } = useSlideEditor();
  const { isSelected, select, toggleSelect, clearSelection } = useSelection();
  const { drag } = state;

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Extract inner content from SVG string (removes <svg> wrapper)
  const svgInnerContent = useMemo(() => {
    if (!svgContent) {
      return undefined;
    }
    const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return match?.[1] ?? undefined;
  }, [svgContent]);

  // Collect all shapes with transforms for rendering and hit areas
  const shapeRenderData = useMemo(
    () => collectShapeRenderData(slide.shapes),
    [slide.shapes]
  );

  // Handle shape click
  const handleShapeClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleSelect(shapeId);
      } else {
        select(shapeId);
      }
    },
    [select, toggleSelect]
  );

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle pointer down for drag
  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: React.PointerEvent) => {
      if (e.button !== 0) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();

      // Select if not already selected
      if (!isSelected(shapeId)) {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          toggleSelect(shapeId);
        } else {
          select(shapeId);
        }
      }

      // Start move drag using unified coordinate conversion
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

      dispatch({
        type: "START_MOVE",
        startX: coords.x as Pixels,
        startY: coords.y as Pixels,
      });
    },
    [dispatch, width, height, isSelected, select, toggleSelect]
  );

  // Handle context menu (right-click)
  const handleContextMenu = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Select the shape if not already selected
      if (!isSelected(shapeId)) {
        select(shapeId);
      }

      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [isSelected, select]
  );

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 0,
    paddingBottom: `${((height as number) / (width as number)) * 100}%`,
    overflow: "hidden",
    ...style,
  };

  const innerContainerStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  };

  const svgStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    cursor: drag.type !== "idle" ? "grabbing" : "default",
  };

  return (
    <div
      className={className}
      style={containerStyle}
      onClick={handleBackgroundClick}
    >
      <div style={innerContainerStyle}>
        <svg
          style={svgStyle}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Rendered content layer */}
          {svgInnerContent && (
            <g dangerouslySetInnerHTML={{ __html: svgInnerContent }} />
          )}

          {/* Fallback renderer (when no svgContent) */}
          {!svgContent && shapeRenderData.map((shape) => (
            <g
              key={`render-${shape.id}`}
              transform={getRotationTransform(shape.rotation, shape.x, shape.y, shape.width, shape.height)}
            >
              <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill ?? "#e0e0e0"}
                stroke={shape.stroke ?? "#666"}
                strokeWidth={shape.strokeWidth}
              />
              {shape.name && (
                <text
                  x={shape.x + shape.width / 2}
                  y={shape.y + shape.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(14, shape.width / 10, shape.height / 3)}
                  fill="#333"
                  style={{ pointerEvents: "none" }}
                >
                  {shape.name}
                </text>
              )}
            </g>
          ))}

          {/* Hit areas for each shape */}
          {shapeRenderData.map((shape) => (
            <g
              key={`hit-${shape.id}`}
              transform={getRotationTransform(shape.rotation, shape.x, shape.y, shape.width, shape.height)}
            >
              <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={debugHitAreas ? "rgba(0, 100, 255, 0.1)" : "transparent"}
                stroke={debugHitAreas ? "rgba(0, 100, 255, 0.3)" : "none"}
                strokeWidth={1}
                style={{ cursor: "pointer" }}
                onClick={(e) => handleShapeClick(shape.id, e)}
                onPointerDown={(e) => handlePointerDown(shape.id, e)}
                onContextMenu={(e) => handleContextMenu(shape.id, e)}
                data-shape-id={shape.id}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <SlideContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}
