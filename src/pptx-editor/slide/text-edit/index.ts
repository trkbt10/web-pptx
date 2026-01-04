/**
 * @file Text editing module
 *
 * Provides utilities for inline text editing in the slide editor.
 * Implements hybrid text editing with hidden textarea and visual cursor overlay.
 */

// State types and constructors
export {
  type TextEditBounds,
  type InactiveTextEditState,
  type ActiveTextEditState,
  type TextEditState,
  createInactiveTextEditState,
  createActiveTextEditState,
  isTextEditInactive,
  isTextEditActive,
} from "./state";

// Cursor position mapping and text utilities
export {
  type CursorPosition,
  type TextSelection,
  type CursorCoordinates,
  type SelectionRect,
  getPlainText,
  offsetToCursorPosition,
  cursorPositionToOffset,
  cursorPositionToCoordinates,
  selectionToRects,
  isSamePosition,
  isBefore,
  normalizeSelection,
  mergeTextIntoBody,
} from "./cursor";

// Text edit controller component
export {
  TextEditController,
  type TextEditControllerProps,
  type CursorState,
} from "./TextEditController";
