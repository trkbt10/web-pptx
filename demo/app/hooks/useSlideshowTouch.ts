/**
 * @file Touch input hook for slideshow
 *
 * Handles touch navigation:
 * - Tap: Next step
 * - Swipe left/up: Next step
 * - Swipe right/down: Previous step
 */

import { useEffect, useCallback, useRef, type RefObject } from "react";

export type SlideshowTouchHandlers = {
  onNext: () => void;
  onPrev: () => void;
};

const SWIPE_THRESHOLD = 50; // Minimum distance for swipe detection
const SWIPE_TIMEOUT = 300; // Maximum time for swipe gesture (ms)

export function useSlideshowTouch(
  containerRef: RefObject<HTMLElement | null>,
  handlers: SlideshowTouchHandlers
) {
  const { onNext, onPrev } = handlers;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (!start || e.changedTouches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const deltaTime = Date.now() - start.time;

      touchStartRef.current = null;

      // Check if it's a valid swipe
      if (deltaTime > SWIPE_TIMEOUT) {
        // Too slow, treat as tap
        onNext();
        return;
      }

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine swipe direction
      if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
        // It's a swipe
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX < 0) {
            // Swipe left -> next
            onNext();
          } else {
            // Swipe right -> prev
            onPrev();
          }
        } else {
          // Vertical swipe
          if (deltaY < 0) {
            // Swipe up -> next
            onNext();
          } else {
            // Swipe down -> prev
            onPrev();
          }
        }
      } else {
        // It's a tap -> next
        onNext();
      }
    },
    [onNext, onPrev]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchEnd]);
}
