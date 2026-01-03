/**
 * @file Generic undo/redo hook
 *
 * A reusable undo/redo state management hook that can be used
 * independently of the slide editor.
 */

import { useReducer, useCallback, useMemo } from "react";
import {
  type UndoRedoHistory,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "../slide/types";

/**
 * Actions for undo/redo reducer
 */
type UndoRedoAction<T> =
  | { readonly type: "SET"; readonly value: T }
  | { readonly type: "UPDATE"; readonly updater: (value: T) => T }
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "RESET"; readonly value: T };

/**
 * Reducer for undo/redo history
 */
function undoRedoReducer<T>(
  state: UndoRedoHistory<T>,
  action: UndoRedoAction<T>
): UndoRedoHistory<T> {
  switch (action.type) {
    case "SET":
      return pushHistory(state, action.value);
    case "UPDATE":
      return pushHistory(state, action.updater(state.present));
    case "UNDO":
      return undoHistory(state);
    case "REDO":
      return redoHistory(state);
    case "RESET":
      return createHistory(action.value);
    default:
      return state;
  }
}

/**
 * Result of useUndoRedo hook
 */
export type UseUndoRedoResult<T> = {
  /** Current value */
  readonly value: T;
  /** Set a new value (pushes to history) */
  readonly set: (value: T) => void;
  /** Update current value with a function (pushes to history) */
  readonly update: (updater: (value: T) => T) => void;
  /** Undo to previous state */
  readonly undo: () => void;
  /** Redo to next state */
  readonly redo: () => void;
  /** Reset history with new initial value */
  readonly reset: (value: T) => void;
  /** Whether undo is available */
  readonly canUndo: boolean;
  /** Whether redo is available */
  readonly canRedo: boolean;
  /** Number of undo steps available */
  readonly undoCount: number;
  /** Number of redo steps available */
  readonly redoCount: number;
};

/**
 * Generic undo/redo hook
 *
 * @param initialValue - Initial value
 * @returns Undo/redo state and actions
 *
 * @example
 * ```tsx
 * const { value, set, undo, redo, canUndo, canRedo } = useUndoRedo(initialValue);
 *
 * // Update value
 * set(newValue);
 *
 * // Or update with function
 * update(v => ({ ...v, field: newFieldValue }));
 *
 * // Undo/redo
 * if (canUndo) undo();
 * if (canRedo) redo();
 * ```
 */
export function useUndoRedo<T>(initialValue: T): UseUndoRedoResult<T> {
  const [history, dispatch] = useReducer(
    undoRedoReducer<T>,
    initialValue,
    createHistory
  );

  const set = useCallback((value: T) => {
    dispatch({ type: "SET", value });
  }, []);

  const update = useCallback((updater: (value: T) => T) => {
    dispatch({ type: "UPDATE", updater });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const reset = useCallback((value: T) => {
    dispatch({ type: "RESET", value });
  }, []);

  return useMemo(
    () => ({
      value: history.present,
      set,
      update,
      undo,
      redo,
      reset,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      undoCount: history.past.length,
      redoCount: history.future.length,
    }),
    [history, set, update, undo, redo, reset]
  );
}
