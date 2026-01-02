/**
 * @file Mouse input hook for slideshow
 *
 * Handles mouse navigation:
 * - Left click: Next step (or previous if clicking left half)
 * - Right click: Previous step
 */

import { useEffect, useCallback, type RefObject } from "react";

export type SlideshowMouseHandlers = {
  onNext: () => void;
  onPrev: () => void;
};

export function useSlideshowMouse(
  containerRef: RefObject<HTMLElement | null>,
  handlers: SlideshowMouseHandlers
) {
  const { onNext, onPrev } = handlers;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      // Only handle clicks on the container itself or slide area
      const container = containerRef.current;
      if (!container) return;

      // Don't handle clicks on buttons or links
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLAnchorElement ||
        (e.target instanceof Element && e.target.closest("button, a"))
      ) {
        return;
      }

      // Determine if click is on left or right half
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const isLeftHalf = clickX < rect.width / 2;

      if (isLeftHalf) {
        onPrev();
      } else {
        onNext();
      }
    },
    [containerRef, onNext, onPrev]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Check if right-click is within the container
      if (container.contains(e.target as Node)) {
        e.preventDefault();
        onPrev();
      }
    },
    [containerRef, onPrev]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("click", handleClick);
    container.addEventListener("contextmenu", handleContextMenu);

    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [containerRef, handleClick, handleContextMenu]);
}
