/**
 * @file Presentation editor types
 *
 * Types for the presentation-level editor.
 * Uses state/ module for shared state management primitives.
 */

import type { Slide, Shape, Presentation } from "../../pptx/domain";
import type { ShapeId, Pixels } from "../../pptx/domain/types";
import type {
  UndoRedoHistory,
  SelectionState,
  DragState,
  ClipboardContent,
  ResizeHandlePosition,
} from "../state";

// =============================================================================
// Presentation Document Types
// =============================================================================

/**
 * Slide identifier
 */
export type SlideId = string;

/**
 * Presentation document for editing
 */
export type PresentationDocument = {
  /** Original presentation data */
  readonly presentation: Presentation;
  /** Slides with their IDs */
  readonly slides: readonly SlideWithId[];
  /** Slide dimensions */
  readonly slideWidth: Pixels;
  readonly slideHeight: Pixels;
};

/**
 * Slide with ID for tracking
 */
export type SlideWithId = {
  readonly id: SlideId;
  readonly slide: Slide;
};

// =============================================================================
// Presentation Editor State
// =============================================================================

/**
 * Complete presentation editor state
 *
 * Uses presentation-level undo/redo history that tracks all changes
 * across slides for unified undo/redo behavior.
 */
export type PresentationEditorState = {
  /** Presentation document with undo/redo history */
  readonly documentHistory: UndoRedoHistory<PresentationDocument>;
  /** Currently active slide ID */
  readonly activeSlideId: SlideId | undefined;
  /** Shape selection within the active slide */
  readonly shapeSelection: SelectionState;
  /** Current drag operation */
  readonly drag: DragState;
  /** Clipboard content */
  readonly clipboard: ClipboardContent | undefined;
};

// =============================================================================
// Presentation Editor Actions
// =============================================================================

/**
 * Actions for presentation editor reducer
 */
export type PresentationEditorAction =
  // Document mutations
  | { readonly type: "SET_DOCUMENT"; readonly document: PresentationDocument }

  // Slide management
  | { readonly type: "ADD_SLIDE"; readonly slide: Slide; readonly afterSlideId?: SlideId }
  | { readonly type: "DELETE_SLIDE"; readonly slideId: SlideId }
  | { readonly type: "DUPLICATE_SLIDE"; readonly slideId: SlideId }
  | { readonly type: "MOVE_SLIDE"; readonly slideId: SlideId; readonly toIndex: number }
  | { readonly type: "SELECT_SLIDE"; readonly slideId: SlideId }

  // Active slide mutations
  | { readonly type: "UPDATE_ACTIVE_SLIDE"; readonly updater: (slide: Slide) => Slide }
  | {
      readonly type: "UPDATE_SHAPE";
      readonly shapeId: ShapeId;
      readonly updater: (shape: Shape) => Shape;
    }
  | { readonly type: "DELETE_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "ADD_SHAPE"; readonly shape: Shape }
  | {
      readonly type: "REORDER_SHAPE";
      readonly shapeId: ShapeId;
      readonly direction: "front" | "back" | "forward" | "backward";
    }
  | { readonly type: "UNGROUP_SHAPE"; readonly shapeId: ShapeId }
  | { readonly type: "GROUP_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | {
      readonly type: "MOVE_SHAPE_TO_INDEX";
      readonly shapeId: ShapeId;
      readonly newIndex: number;
    }

  // Shape selection
  | {
      readonly type: "SELECT_SHAPE";
      readonly shapeId: ShapeId;
      readonly addToSelection: boolean;
    }
  | { readonly type: "SELECT_MULTIPLE_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "CLEAR_SHAPE_SELECTION" }

  // Drag operations
  | { readonly type: "START_MOVE"; readonly startX: Pixels; readonly startY: Pixels }
  | {
      readonly type: "START_RESIZE";
      readonly handle: ResizeHandlePosition;
      readonly startX: Pixels;
      readonly startY: Pixels;
      readonly aspectLocked: boolean;
    }
  | { readonly type: "START_ROTATE"; readonly startX: Pixels; readonly startY: Pixels }
  | { readonly type: "END_DRAG" }

  // Undo/Redo (presentation-wide)
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }

  // Clipboard
  | { readonly type: "COPY" }
  | { readonly type: "PASTE" };

// =============================================================================
// Context Value Types
// =============================================================================

/**
 * Presentation editor context value
 */
export type PresentationEditorContextValue = {
  readonly state: PresentationEditorState;
  readonly dispatch: (action: PresentationEditorAction) => void;
  /** Current document (from history.present) */
  readonly document: PresentationDocument;
  /** Active slide */
  readonly activeSlide: SlideWithId | undefined;
  /** Selected shapes in active slide */
  readonly selectedShapes: readonly Shape[];
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
};
