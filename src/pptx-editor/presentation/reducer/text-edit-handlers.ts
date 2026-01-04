/**
 * @file Text edit handlers
 *
 * Handlers for text editing operations.
 */

import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { HandlerMap } from "./handler-types";
import { updateActiveSlideInDocument } from "./helpers";
import { findSlideById } from "../slide";
import { pushHistory } from "../../state";
import { findShapeById } from "../../shape/query";
import { updateShapeById } from "../../shape/mutation";
import { getShapeTransform } from "../../shape/transform";
import {
  createInactiveTextEditState,
  createActiveTextEditState,
} from "../../slide/text-edit";

type EnterTextEditAction = Extract<
  PresentationEditorAction,
  { type: "ENTER_TEXT_EDIT" }
>;
// Note: ExitTextEditAction type not needed since handler doesn't use action payload
type UpdateTextBodyAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_TEXT_BODY" }
>;

/**
 * Get active slide for text editing
 */
function getActiveSlideForTextEdit(
  state: PresentationEditorState
): ReturnType<typeof findSlideById> {
  if (!state.activeSlideId) {
    return undefined;
  }
  return findSlideById(state.documentHistory.present, state.activeSlideId);
}

function handleEnterTextEdit(
  state: PresentationEditorState,
  action: EnterTextEditAction
): PresentationEditorState {
  const activeSlide = getActiveSlideForTextEdit(state);
  if (!activeSlide) {
    return state;
  }

  const shape = findShapeById(activeSlide.slide.shapes, action.shapeId);
  if (!shape || shape.type !== "sp" || !shape.textBody) {
    return state;
  }

  const transform = getShapeTransform(shape);
  if (!transform) {
    return state;
  }

  return {
    ...state,
    textEdit: createActiveTextEditState(
      action.shapeId,
      {
        x: transform.x,
        y: transform.y,
        width: transform.width,
        height: transform.height,
        rotation: transform.rotation as number,
      },
      shape.textBody
    ),
  };
}

function handleExitTextEdit(
  state: PresentationEditorState
): PresentationEditorState {
  return {
    ...state,
    textEdit: createInactiveTextEditState(),
  };
}

function handleUpdateTextBody(
  state: PresentationEditorState,
  action: UpdateTextBodyAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: updateShapeById(slide.shapes, action.shapeId, (shape) => {
        if (shape.type !== "sp") {
          return shape;
        }
        return { ...shape, textBody: action.textBody };
      }),
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    textEdit: createInactiveTextEditState(),
  };
}

/**
 * Text edit handlers
 */
export const TEXT_EDIT_HANDLERS: HandlerMap = {
  ENTER_TEXT_EDIT: handleEnterTextEdit,
  EXIT_TEXT_EDIT: handleExitTextEdit,
  UPDATE_TEXT_BODY: handleUpdateTextBody,
};
