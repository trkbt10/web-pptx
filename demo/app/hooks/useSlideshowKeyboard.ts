/**
 * @file Keyboard input hook for slideshow
 *
 * Handles keyboard navigation:
 * - →, ↓, Space, Enter, N, PageDown: Next step
 * - ←, ↑, Backspace, P, PageUp: Previous step
 * - Escape: End slideshow
 * - Home / End: First / Last slide
 * - F: Toggle fullscreen
 * - B: Black screen
 * - W: White screen
 */

import { useEffect, useCallback } from "react";

export type SlideshowKeyboardHandlers = {
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
  onFirst: () => void;
  onLast: () => void;
  onToggleFullscreen: () => void;
  onToggleBlack: () => void;
  onToggleWhite: () => void;
};

export function useSlideshowKeyboard(handlers: SlideshowKeyboardHandlers) {
  const {
    onNext,
    onPrev,
    onEnd,
    onFirst,
    onLast,
    onToggleFullscreen,
    onToggleBlack,
    onToggleWhite,
  } = handlers;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        // Next step
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "Enter":
        case "n":
        case "N":
        case "PageDown":
          e.preventDefault();
          onNext();
          break;

        // Previous step
        case "ArrowLeft":
        case "ArrowUp":
        case "Backspace":
        case "p":
        case "P":
        case "PageUp":
          e.preventDefault();
          onPrev();
          break;

        // End slideshow
        case "Escape":
          e.preventDefault();
          onEnd();
          break;

        // First slide
        case "Home":
          e.preventDefault();
          onFirst();
          break;

        // Last slide
        case "End":
          e.preventDefault();
          onLast();
          break;

        // Toggle fullscreen
        case "f":
        case "F":
          e.preventDefault();
          onToggleFullscreen();
          break;

        // Black screen
        case "b":
        case "B":
        case ".":
          e.preventDefault();
          onToggleBlack();
          break;

        // White screen
        case "w":
        case "W":
        case ",":
          e.preventDefault();
          onToggleWhite();
          break;
      }
    },
    [onNext, onPrev, onEnd, onFirst, onLast, onToggleFullscreen, onToggleBlack, onToggleWhite]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
