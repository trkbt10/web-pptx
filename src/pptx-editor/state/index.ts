/**
 * @file State module entry point
 *
 * Editor state management utilities.
 * This module provides generic state management primitives
 * used across slide and presentation editors.
 */

// =============================================================================
// History
// =============================================================================
export {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
} from "./history";
export type { UndoRedoHistory } from "./history";

// =============================================================================
// Selection
// =============================================================================
export {
  createEmptySelection,
  createSingleSelection,
  createMultiSelection,
  addToSelection,
  removeFromSelection,
  toggleSelection,
  isSelected,
  isSelectionEmpty,
} from "./selection";
export type { SelectionState } from "./selection";

// =============================================================================
// Drag
// =============================================================================
export {
  createIdleDragState,
  isDragIdle,
  isDragMove,
  isDragResize,
  isDragRotate,
} from "./drag";
export type {
  ResizeHandlePosition,
  IdleDragState,
  MoveDragState,
  ResizeDragState,
  RotateDragState,
  DragState,
} from "./drag";

// =============================================================================
// Clipboard
// =============================================================================
export { createClipboardContent, incrementPasteCount } from "./clipboard";
export type { ClipboardContent } from "./clipboard";
