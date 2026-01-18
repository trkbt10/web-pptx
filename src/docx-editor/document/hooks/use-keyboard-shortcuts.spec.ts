/**
 * @file useKeyboardShortcuts unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { DocxEditorAction, DocxEditorState } from "../../context/document/editor/types";
import { createEmptyEditorState } from "../../context/document/editor";
import { createEmptyTextSelection, createSingleElementSelection } from "../../context/document/state";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

afterEach(() => {
  vi.restoreAllMocks();
});

function dispatchKeyDown(init: KeyboardEventInit): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

function createElementSelectedState(): DocxEditorState {
  const base = createEmptyEditorState();
  return {
    ...base,
    selection: {
      ...base.selection,
      element: createSingleElementSelection("0"),
      text: createEmptyTextSelection(),
      mode: "element",
    },
  };
}

function createTextEditingState(): DocxEditorState {
  const base = createEmptyEditorState();
  return {
    ...base,
    textEdit: {
      isEditing: true,
      editingElementId: "0",
      cursorPosition: { paragraphIndex: 0, charOffset: 0 },
    },
  };
}

describe("useKeyboardShortcuts", () => {
  it("dispatches UNDO on Cmd/Ctrl+Z", () => {
    const state = createElementSelectedState();
    const dispatch = vi.fn((action: DocxEditorAction) => {
      void action;
    });

    renderHook(() => useKeyboardShortcuts(dispatch, state));
    dispatchKeyDown({ key: "z", ctrlKey: true });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "UNDO" });
  });

  it("dispatches TOGGLE_BOLD on Cmd/Ctrl+B", () => {
    const state = createTextEditingState();
    const dispatch = vi.fn((action: DocxEditorAction) => {
      void action;
    });

    renderHook(() => useKeyboardShortcuts(dispatch, state));
    dispatchKeyDown({ key: "b", ctrlKey: true });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_BOLD" });
  });

  it("dispatches END_TEXT_EDIT on Escape", () => {
    const state = createTextEditingState();
    const dispatch = vi.fn((action: DocxEditorAction) => {
      void action;
    });

    renderHook(() => useKeyboardShortcuts(dispatch, state));
    dispatchKeyDown({ key: "Escape" });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "END_TEXT_EDIT" });
  });

  it("ignores text shortcuts when not editing text", () => {
    const state = createElementSelectedState();
    const dispatch = vi.fn((action: DocxEditorAction) => {
      void action;
    });

    renderHook(() => useKeyboardShortcuts(dispatch, state));
    dispatchKeyDown({ key: "b", ctrlKey: true });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("cleans up the keydown event listener on unmount", () => {
    const state = createElementSelectedState();
    const dispatch = vi.fn((action: DocxEditorAction) => {
      void action;
    });
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useKeyboardShortcuts(dispatch, state));
    const keydownCall = addSpy.mock.calls.find((call) => call[0] === "keydown");
    expect(keydownCall).toBeDefined();

    const handler = keydownCall?.[1];
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", handler);
  });
});
