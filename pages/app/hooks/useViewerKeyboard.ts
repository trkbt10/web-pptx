/**
 * @file useViewerKeyboard
 *
 * Keyboard navigation hook for slide viewer mode.
 * Provides basic navigation without slideshow-specific features.
 */

import { useEffect } from "react";

export type ViewerKeyboardActions = {
  goToNext: () => void;
  goToPrev: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  onStartSlideshow: () => void;
  onExit: () => void;
};

/**
 * Hook for viewer keyboard navigation.
 *
 * Supported keys:
 * - ArrowRight, ArrowDown: Next slide
 * - ArrowLeft, ArrowUp: Previous slide
 * - Home: Go to first slide
 * - End: Go to last slide
 * - F: Start slideshow
 * - Escape: Exit viewer
 */
export function useViewerKeyboard(actions: ViewerKeyboardActions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          actions.goToNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          actions.goToPrev();
          break;

        case "Home":
          e.preventDefault();
          actions.goToFirst();
          break;

        case "End":
          e.preventDefault();
          actions.goToLast();
          break;

        case "f":
        case "F":
          e.preventDefault();
          actions.onStartSlideshow();
          break;

        case "Escape":
          e.preventDefault();
          actions.onExit();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
}
