/**
 * @file useSlideshowKeyboard
 *
 * Keyboard navigation hook for slideshow presentation mode.
 * Handles all keyboard shortcuts for slide navigation and controls.
 */

import { useEffect } from "react";

export type SlideshowKeyboardActions = {
  goToNext: () => void;
  goToPrev: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  toggleFullscreen: () => void;
  toggleBlackScreen: () => void;
  toggleWhiteScreen: () => void;
  onExit: () => void;
};

/**
 * Hook for slideshow keyboard navigation.
 *
 * Supported keys:
 * - ArrowRight, ArrowDown, Space, Enter, N, PageDown: Next slide
 * - ArrowLeft, ArrowUp, Backspace, P, PageUp: Previous slide
 * - Home: Go to first slide
 * - End: Go to last slide
 * - F: Toggle fullscreen
 * - B, .: Toggle black screen
 * - W, ,: Toggle white screen
 * - Escape: Exit slideshow
 */
export function useSlideshowKeyboard(actions: SlideshowKeyboardActions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "Enter":
        case "n":
        case "N":
        case "PageDown":
          e.preventDefault();
          actions.goToNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
        case "Backspace":
        case "p":
        case "P":
        case "PageUp":
          e.preventDefault();
          actions.goToPrev();
          break;

        case "Escape":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          actions.onExit();
          break;

        case "f":
        case "F":
          e.preventDefault();
          actions.toggleFullscreen();
          break;

        case "b":
        case "B":
        case ".":
          e.preventDefault();
          actions.toggleBlackScreen();
          break;

        case "w":
        case "W":
        case ",":
          e.preventDefault();
          actions.toggleWhiteScreen();
          break;

        case "Home":
          e.preventDefault();
          actions.goToFirst();
          break;

        case "End":
          e.preventDefault();
          actions.goToLast();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
}
