/**
 * @file Slide state hook
 *
 * Provides convenient API for slide mutations.
 */

import { useCallback, useMemo } from "react";
import type { Slide, Shape } from "../../../pptx/domain";
import type { Transform } from "../../../pptx/domain/types";
import { px } from "../../../pptx/domain/types";
import { useSlideEditor } from "../../context/SlideEditorContext";
import type { ShapeId } from "../types";

/**
 * Result of useSlideState hook
 */
export type UseSlideStateResult = {
  /** Current slide */
  readonly slide: Slide;
  /** Update slide with updater function */
  readonly updateSlide: (updater: (slide: Slide) => Slide) => void;
  /** Update a specific shape */
  readonly updateShape: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
  /** Update shape transform */
  readonly updateShapeTransform: (
    shapeId: ShapeId,
    transform: Partial<Transform>
  ) => void;
  /** Nudge shapes by delta (relative move) */
  readonly nudgeShapes: (
    shapeIds: readonly ShapeId[],
    dx: number,
    dy: number
  ) => void;
  /** Delete shapes by IDs */
  readonly deleteShapes: (shapeIds: readonly ShapeId[]) => void;
  /** Delete selected shapes */
  readonly deleteSelected: () => void;
  /** Add a new shape */
  readonly addShape: (shape: Shape) => void;
  /** Duplicate selected shapes */
  readonly duplicateSelected: () => void;
  /** Reorder shape (front, back, forward, backward) */
  readonly reorderShape: (
    shapeId: ShapeId,
    direction: "front" | "back" | "forward" | "backward"
  ) => void;
  /** Undo */
  readonly undo: () => void;
  /** Redo */
  readonly redo: () => void;
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
};

/**
 * Hook for slide state mutations
 *
 * Provides a convenient API for updating slide and shapes.
 */
export function useSlideState(): UseSlideStateResult {
  const { state, dispatch, slide, canUndo, canRedo } = useSlideEditor();

  const updateSlide = useCallback(
    (updater: (slide: Slide) => Slide) => {
      dispatch({ type: "UPDATE_SLIDE", updater });
    },
    [dispatch]
  );

  const updateShape = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    [dispatch]
  );

  const updateShapeTransform = useCallback(
    (shapeId: ShapeId, transformUpdate: Partial<Transform>) => {
      dispatch({
        type: "UPDATE_SHAPE",
        shapeId,
        updater: (shape) => {
          if (!("properties" in shape)) return shape;
          const currentTransform = shape.properties.transform;
          if (!currentTransform) return shape;
          return {
            ...shape,
            properties: {
              ...shape.properties,
              transform: {
                ...currentTransform,
                ...transformUpdate,
              },
            },
          } as Shape;
        },
      });
    },
    [dispatch]
  );

  const nudgeShapes = useCallback(
    (shapeIds: readonly ShapeId[], dx: number, dy: number) => {
      for (const shapeId of shapeIds) {
        dispatch({
          type: "UPDATE_SHAPE",
          shapeId,
          updater: (shape) => {
            if (!("properties" in shape)) return shape;
            const currentTransform = shape.properties.transform;
            if (!currentTransform) return shape;
            return {
              ...shape,
              properties: {
                ...shape.properties,
                transform: {
                  ...currentTransform,
                  x: px((currentTransform.x as number) + dx),
                  y: px((currentTransform.y as number) + dy),
                },
              },
            } as Shape;
          },
        });
      }
    },
    [dispatch]
  );

  const deleteShapes = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "DELETE_SHAPES", shapeIds });
    },
    [dispatch]
  );

  const deleteSelected = useCallback(() => {
    if (state.selection.selectedIds.length > 0) {
      dispatch({ type: "DELETE_SHAPES", shapeIds: state.selection.selectedIds });
    }
  }, [dispatch, state.selection.selectedIds]);

  const addShape = useCallback(
    (shape: Shape) => {
      dispatch({ type: "ADD_SHAPE", shape });
    },
    [dispatch]
  );

  const duplicateSelected = useCallback(() => {
    dispatch({ type: "COPY" });
    dispatch({ type: "PASTE" });
  }, [dispatch]);

  const reorderShape = useCallback(
    (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => {
      dispatch({ type: "REORDER_SHAPE", shapeId, direction });
    },
    [dispatch]
  );

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  return useMemo(
    () => ({
      slide,
      updateSlide,
      updateShape,
      updateShapeTransform,
      nudgeShapes,
      deleteShapes,
      deleteSelected,
      addShape,
      duplicateSelected,
      reorderShape,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      slide,
      updateSlide,
      updateShape,
      updateShapeTransform,
      nudgeShapes,
      deleteShapes,
      deleteSelected,
      addShape,
      duplicateSelected,
      reorderShape,
      undo,
      redo,
      canUndo,
      canRedo,
    ]
  );
}
