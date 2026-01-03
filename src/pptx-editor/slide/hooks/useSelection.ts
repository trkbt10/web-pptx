/**
 * @file Selection hook
 *
 * Provides convenient API for shape selection.
 */

import { useCallback, useMemo } from "react";
import type { Shape } from "../../../pptx/domain";
import { useSlideEditor } from "../context";
import type { ShapeId, SelectionState } from "../types";

/**
 * Result of useSelection hook
 */
export type UseSelectionResult = {
  /** Current selection state */
  readonly selection: SelectionState;
  /** Selected shape IDs */
  readonly selectedIds: readonly ShapeId[];
  /** Selected shapes */
  readonly selectedShapes: readonly Shape[];
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Primary selected shape ID */
  readonly primaryId: ShapeId | undefined;
  /** Whether any shapes are selected */
  readonly hasSelection: boolean;
  /** Whether multiple shapes are selected */
  readonly isMultiSelect: boolean;
  /** Select a single shape */
  readonly select: (shapeId: ShapeId) => void;
  /** Add shape to selection (or remove if already selected) */
  readonly toggleSelect: (shapeId: ShapeId) => void;
  /** Select multiple shapes */
  readonly selectMultiple: (shapeIds: readonly ShapeId[]) => void;
  /** Clear selection */
  readonly clearSelection: () => void;
  /** Check if shape is selected */
  readonly isSelected: (shapeId: ShapeId) => boolean;
  /** Select all shapes */
  readonly selectAll: () => void;
};

/**
 * Hook for shape selection
 *
 * Provides a convenient API for selecting and managing shape selection.
 */
export function useSelection(): UseSelectionResult {
  const { state, dispatch, slide, selectedShapes, primaryShape } = useSlideEditor();
  const { selection } = state;

  const select = useCallback(
    (shapeId: ShapeId) => {
      dispatch({ type: "SELECT", shapeId, addToSelection: false });
    },
    [dispatch]
  );

  const toggleSelect = useCallback(
    (shapeId: ShapeId) => {
      dispatch({ type: "SELECT", shapeId, addToSelection: true });
    },
    [dispatch]
  );

  const selectMultiple = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "SELECT_MULTIPLE", shapeIds });
    },
    [dispatch]
  );

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, [dispatch]);

  const isSelected = useCallback(
    (shapeId: ShapeId) => {
      return selection.selectedIds.includes(shapeId);
    },
    [selection.selectedIds]
  );

  const selectAll = useCallback(() => {
    const allIds: ShapeId[] = [];
    const collectIds = (shapes: readonly Shape[]) => {
      for (const shape of shapes) {
        if ("nonVisual" in shape) {
          allIds.push(shape.nonVisual.id);
        }
        if (shape.type === "grpSp") {
          collectIds(shape.children);
        }
      }
    };
    collectIds(slide.shapes);
    dispatch({ type: "SELECT_MULTIPLE", shapeIds: allIds });
  }, [dispatch, slide.shapes]);

  return useMemo(
    () => ({
      selection,
      selectedIds: selection.selectedIds,
      selectedShapes,
      primaryShape,
      primaryId: selection.primaryId,
      hasSelection: selection.selectedIds.length > 0,
      isMultiSelect: selection.selectedIds.length > 1,
      select,
      toggleSelect,
      selectMultiple,
      clearSelection,
      isSelected,
      selectAll,
    }),
    [
      selection,
      selectedShapes,
      primaryShape,
      select,
      toggleSelect,
      selectMultiple,
      clearSelection,
      isSelected,
      selectAll,
    ]
  );
}
