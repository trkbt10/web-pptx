/**
 * @file Clipboard hook
 *
 * Handles copy/paste operations for shapes.
 */

import { useCallback, useMemo } from "react";
import { useSlideEditor } from "../../context/SlideEditorContext";

// =============================================================================
// Types
// =============================================================================

export type UseClipboardResult = {
  /** Whether clipboard has content */
  readonly hasClipboard: boolean;
  /** Copy selected shapes to clipboard */
  readonly copy: () => void;
  /** Paste shapes from clipboard */
  readonly paste: () => void;
  /** Copy and delete (cut) selected shapes */
  readonly cut: () => void;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for clipboard operations.
 *
 * Provides copy/paste/cut functionality for shapes.
 */
export function useClipboard(): UseClipboardResult {
  const { state, dispatch } = useSlideEditor();

  const hasClipboard = useMemo(() => {
    return state.clipboard !== undefined && state.clipboard.shapes.length > 0;
  }, [state.clipboard]);

  const copy = useCallback(() => {
    dispatch({ type: "COPY" });
  }, [dispatch]);

  const paste = useCallback(() => {
    dispatch({ type: "PASTE" });
  }, [dispatch]);

  const cut = useCallback(() => {
    dispatch({ type: "COPY" });
    const selectedIds = state.selection.selectedIds;
    if (selectedIds.length > 0) {
      dispatch({ type: "DELETE_SHAPES", shapeIds: selectedIds });
    }
  }, [dispatch, state.selection.selectedIds]);

  return useMemo(
    () => ({
      hasClipboard,
      copy,
      paste,
      cut,
    }),
    [hasClipboard, copy, paste, cut]
  );
}
