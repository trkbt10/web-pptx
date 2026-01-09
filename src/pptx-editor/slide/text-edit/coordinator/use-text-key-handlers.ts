/**
 * @file Text key handlers hook
 *
 * Manages key interactions for confirming or cancelling edits.
 */

import { useCallback, type KeyboardEvent, type MutableRefObject } from "react";

type UseTextKeyHandlersArgs = {
  readonly isComposing: boolean;
  readonly currentText: string;
  readonly onCancel: () => void;
  readonly onComplete: (text: string) => void;
  readonly finishedRef: MutableRefObject<boolean>;
};

type UseTextKeyHandlersResult = {
  readonly handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function useTextKeyHandlers({
  isComposing,
  currentText,
  onCancel,
  onComplete,
  finishedRef,
}: UseTextKeyHandlersArgs): UseTextKeyHandlersResult {
  if (onCancel === undefined) {
    throw new Error("useTextKeyHandlers requires onCancel.");
  }
  if (onComplete === undefined) {
    throw new Error("useTextKeyHandlers requires onComplete.");
  }
  if (finishedRef === undefined) {
    throw new Error("useTextKeyHandlers requires finishedRef.");
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposing) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finishedRef.current = true;
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finishedRef.current = true;
        onComplete(currentText);
      }
    },
    [currentText, finishedRef, isComposing, onCancel, onComplete],
  );

  return { handleKeyDown };
}
