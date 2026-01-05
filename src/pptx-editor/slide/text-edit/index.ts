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
  type StickyFormattingState,
  type TextCursorState,
  createInactiveTextEditState,
  createActiveTextEditState,
  isTextEditInactive,
  isTextEditActive,
} from "./state";

// Cursor position mapping
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
} from "./cursor";

// Text body merge utilities
export {
  mergeTextIntoBody,
  extractDefaultRunProperties,
} from "./text-body-merge";

// Text edit controller component
export { TextEditController } from "./TextEditController";

// Text edit types
export type {
  TextEditControllerProps,
  CursorState,
  CompositionState,
  SelectionChangeEvent,
} from "./types";

// Text geometry utilities (shared between cursor and rendering)
export {
  type TextVisualBounds,
  TEXT_ASCENDER_RATIO,
  DEFAULT_FONT_SIZE_PT,
  fontSizeToPixels,
  getLineFontSize,
  getFontSizeAtOffset,
  getTextVisualBounds,
  getLineVisualBounds,
  getVisualBoundsAtOffset,
  getTextWidthForChars,
  getXPositionInLine,
  getLineEndX,
  getLineTextLength,
} from "./text-geometry";
