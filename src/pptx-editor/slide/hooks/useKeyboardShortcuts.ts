/**
 * @file Keyboard shortcuts hook
 *
 * Handles keyboard shortcuts for the slide editor.
 */

import { useEffect, useCallback } from "react";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { useSlideState } from "./useSlideState";
import { useSelection } from "./useSelection";
import { useClipboard } from "./useClipboard";

// =============================================================================
// Types
// =============================================================================

export type UseKeyboardShortcutsOptions = {
  /** Whether shortcuts are enabled */
  readonly enabled?: boolean;
  /** Nudge distance in pixels */
  readonly nudgeDistance?: number;
  /** Large nudge distance (with shift) in pixels */
  readonly largeNudgeDistance?: number;
};

export type UseKeyboardShortcutsResult = {
  /** Whether shortcuts are currently enabled */
  readonly enabled: boolean;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for keyboard shortcuts.
 *
 * Supports:
 * - Delete/Backspace: Delete selected shapes
 * - Ctrl+C: Copy
 * - Ctrl+V: Paste
 * - Ctrl+X: Cut
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Ctrl+A: Select all
 * - Ctrl+D: Duplicate
 * - Arrow keys: Nudge selected shapes
 * - Shift+Arrow: Large nudge
 * - Escape: Clear selection
 */
export function useKeyboardShortcuts({
  enabled = true,
  nudgeDistance = 1,
  largeNudgeDistance = 10,
}: UseKeyboardShortcutsOptions = {}): UseKeyboardShortcutsResult {
  const { canUndo, canRedo } = useSlideEditor();
  const { deleteSelected, nudgeShapes, undo, redo, duplicateSelected } = useSlideState();
  const { hasSelection, clearSelection, selectAll, selectedIds } = useSelection();
  const { copy, paste, cut } = useClipboard();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      switch (e.key) {
        // Delete
        case "Delete":
        case "Backspace":
          if (hasSelection) {
            e.preventDefault();
            deleteSelected();
          }
          break;

        // Copy
        case "c":
        case "C":
          if (isCtrl && hasSelection) {
            e.preventDefault();
            copy();
          }
          break;

        // Paste
        case "v":
        case "V":
          if (isCtrl) {
            e.preventDefault();
            paste();
          }
          break;

        // Cut
        case "x":
        case "X":
          if (isCtrl && hasSelection) {
            e.preventDefault();
            cut();
          }
          break;

        // Undo
        case "z":
        case "Z":
          if (isCtrl && !isShift && canUndo) {
            e.preventDefault();
            undo();
          } else if (isCtrl && isShift && canRedo) {
            e.preventDefault();
            redo();
          }
          break;

        // Redo
        case "y":
        case "Y":
          if (isCtrl && canRedo) {
            e.preventDefault();
            redo();
          }
          break;

        // Select all
        case "a":
        case "A":
          if (isCtrl) {
            e.preventDefault();
            selectAll();
          }
          break;

        // Duplicate
        case "d":
        case "D":
          if (isCtrl && hasSelection) {
            e.preventDefault();
            duplicateSelected();
          }
          break;

        // Clear selection
        case "Escape":
          if (hasSelection) {
            e.preventDefault();
            clearSelection();
          }
          break;

        // Nudge
        case "ArrowUp":
          if (hasSelection) {
            e.preventDefault();
            const dy = isShift ? -largeNudgeDistance : -nudgeDistance;
            nudgeShapes(selectedIds, 0, dy);
          }
          break;

        case "ArrowDown":
          if (hasSelection) {
            e.preventDefault();
            const dyDown = isShift ? largeNudgeDistance : nudgeDistance;
            nudgeShapes(selectedIds, 0, dyDown);
          }
          break;

        case "ArrowLeft":
          if (hasSelection) {
            e.preventDefault();
            const dx = isShift ? -largeNudgeDistance : -nudgeDistance;
            nudgeShapes(selectedIds, dx, 0);
          }
          break;

        case "ArrowRight":
          if (hasSelection) {
            e.preventDefault();
            const dxRight = isShift ? largeNudgeDistance : nudgeDistance;
            nudgeShapes(selectedIds, dxRight, 0);
          }
          break;
      }
    },
    [
      hasSelection,
      deleteSelected,
      copy,
      paste,
      cut,
      undo,
      redo,
      canUndo,
      canRedo,
      selectAll,
      duplicateSelected,
      clearSelection,
      selectedIds,
      nudgeShapes,
      nudgeDistance,
      largeNudgeDistance,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return { enabled };
}
