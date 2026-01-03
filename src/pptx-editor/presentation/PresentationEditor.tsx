/**
 * @file Presentation editor main component
 *
 * IDE-style layout with left sidebar (thumbnails), center (slide canvas),
 * and right sidebar (inspector). Uses react-panel-layout for resizable panels.
 */

import { useMemo, useCallback, type CSSProperties } from "react";
import { GridLayout } from "react-panel-layout/grid";
import type { Slide, Shape } from "../../pptx/domain";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import type { PresentationDocument, SlideWithId, PresentationEditorAction } from "./types";
import type { SlideEditorAction } from "../slide/types";
import { PresentationEditorProvider, usePresentationEditor } from "./context";
import { SlideThumbnailPanel } from "./SlideThumbnailPanel";
import { SlideEditor } from "../slide/SlideEditor";
import { createSlideEditorState } from "../slide/types";
import { findShapeById } from "../shape/query";

// =============================================================================
// Types
// =============================================================================

export type PresentationEditorProps = {
  /** Initial presentation document */
  readonly initialDocument: PresentationDocument;
  /** Render function for slide content */
  readonly renderSlide: (
    slide: Slide,
    width: Pixels,
    height: Pixels
  ) => React.ReactNode;
  /** Optional render function for slide thumbnail */
  readonly renderThumbnail?: (slide: SlideWithId, index: number) => React.ReactNode;
  /** Show property panel */
  readonly showPropertyPanel?: boolean;
  /** Show layer panel */
  readonly showLayerPanel?: boolean;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** CSS class for the container */
  readonly className?: string;
  /** CSS style for the container */
  readonly style?: CSSProperties;
};

// =============================================================================
// Grid Configuration
// =============================================================================

const gridConfig = {
  areas: [
    ["thumbnails", "canvas"],
  ],
  columns: [
    { size: "200px", resizable: true, minSize: 150, maxSize: 350 },
    { size: "1fr" },
  ],
  rows: [{ size: "1fr" }],
  gap: "0px",
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

// =============================================================================
// Action Translator
// =============================================================================

/**
 * Translate SlideEditorAction to PresentationEditorAction
 */
function translateSlideAction(action: SlideEditorAction): PresentationEditorAction | undefined {
  switch (action.type) {
    // Selection actions - translate names
    case "SELECT":
      return {
        type: "SELECT_SHAPE",
        shapeId: action.shapeId,
        addToSelection: action.addToSelection,
      };
    case "SELECT_MULTIPLE":
      return { type: "SELECT_MULTIPLE_SHAPES", shapeIds: action.shapeIds };
    case "CLEAR_SELECTION":
      return { type: "CLEAR_SHAPE_SELECTION" };

    // Slide mutations - translate UPDATE_SLIDE to UPDATE_ACTIVE_SLIDE
    case "UPDATE_SLIDE":
      return { type: "UPDATE_ACTIVE_SLIDE", updater: action.updater };
    case "SET_SLIDE":
      // SET_SLIDE doesn't have a direct equivalent in presentation
      // It would need to update the specific slide in the document
      return undefined;

    // These actions have the same shape, just pass through
    case "UPDATE_SHAPE":
    case "DELETE_SHAPES":
    case "ADD_SHAPE":
    case "REORDER_SHAPE":
    case "UNGROUP_SHAPE":
    case "GROUP_SHAPES":
    case "MOVE_SHAPE_TO_INDEX":
    case "START_MOVE":
    case "START_RESIZE":
    case "START_ROTATE":
    case "END_DRAG":
    case "UNDO":
    case "REDO":
    case "COPY":
    case "PASTE":
      return action as unknown as PresentationEditorAction;

    default:
      return undefined;
  }
}

// =============================================================================
// Inner Components
// =============================================================================

function SlideEditorArea({
  showPropertyPanel,
  showLayerPanel,
  showToolbar,
}: {
  readonly showPropertyPanel: boolean;
  readonly showLayerPanel: boolean;
  readonly showToolbar: boolean;
}) {
  const { state, dispatch, document, activeSlide, selectedShapes, primaryShape, canUndo, canRedo } = usePresentationEditor();

  // Create a wrapped dispatch that translates actions
  const slideDispatch = useCallback(
    (action: SlideEditorAction) => {
      const translatedAction = translateSlideAction(action);
      if (translatedAction) {
        dispatch(translatedAction);
      }
    },
    [dispatch]
  );

  if (!activeSlide) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#e0e0e0",
      }}>
        <span style={{ color: "#999" }}>No slide selected</span>
      </div>
    );
  }

  // Create a SlideEditorState-compatible object from presentation state
  const slideEditorState = useMemo(() => ({
    slideHistory: {
      past: [],
      present: activeSlide.slide,
      future: [],
    },
    selection: state.shapeSelection,
    drag: state.drag,
    clipboard: state.clipboard,
  }), [activeSlide.slide, state.shapeSelection, state.drag, state.clipboard]);

  return (
    <SlideEditor
      state={slideEditorState}
      dispatch={slideDispatch}
      slide={activeSlide.slide}
      selectedShapes={selectedShapes}
      primaryShape={primaryShape}
      canUndo={canUndo}
      canRedo={canRedo}
      width={document.slideWidth}
      height={document.slideHeight}
      showPropertyPanel={showPropertyPanel}
      showLayerPanel={showLayerPanel}
      showToolbar={showToolbar}
    />
  );
}

function EditorLayout({
  renderThumbnail,
  showPropertyPanel,
  showLayerPanel,
  showToolbar,
}: {
  readonly renderThumbnail?: PresentationEditorProps["renderThumbnail"];
  readonly showPropertyPanel: boolean;
  readonly showLayerPanel: boolean;
  readonly showToolbar: boolean;
}) {
  const layers = useMemo(
    () => [
      {
        id: "thumbnails",
        component: <SlideThumbnailPanel renderThumbnail={renderThumbnail} />,
      },
      {
        id: "canvas",
        component: (
          <SlideEditorArea
            showPropertyPanel={showPropertyPanel}
            showLayerPanel={showLayerPanel}
            showToolbar={showToolbar}
          />
        ),
      },
    ],
    [renderThumbnail, showPropertyPanel, showLayerPanel, showToolbar]
  );

  return (
    <GridLayout
      config={gridConfig}
      layers={layers}
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Presentation editor main component
 *
 * Provides an IDE-style layout with:
 * - Left sidebar: Slide thumbnails
 * - Center: Slide editor with canvas, property panel, and layer panel
 *
 * Uses react-panel-layout for resizable panels.
 */
export function PresentationEditor({
  initialDocument,
  renderSlide,
  renderThumbnail,
  showPropertyPanel = true,
  showLayerPanel = true,
  showToolbar = true,
  className,
  style,
}: PresentationEditorProps) {
  const containerStyles = useMemo<CSSProperties>(
    () => ({
      ...containerStyle,
      ...style,
    }),
    [style]
  );

  return (
    <PresentationEditorProvider initialDocument={initialDocument}>
      <div className={className} style={containerStyles}>
        <EditorLayout
          renderThumbnail={renderThumbnail}
          showPropertyPanel={showPropertyPanel}
          showLayerPanel={showLayerPanel}
          showToolbar={showToolbar}
        />
      </div>
    </PresentationEditorProvider>
  );
}
