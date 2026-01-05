/**
 * @file Canvas viewport hook
 *
 * Tracks scroll container size and scroll offsets for the editor canvas.
 */

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

export type CanvasViewport = {
  readonly width: number;
  readonly height: number;
};

const DEFAULT_VIEWPORT: CanvasViewport = {
  width: 0,
  height: 0,
};

/**
 * Hook for scroll container metrics.
 */
export function useCanvasViewport(): {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly viewport: CanvasViewport;
  readonly handleScroll: () => void;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<CanvasViewport>(DEFAULT_VIEWPORT);

  const updateViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const nextWidth = container.clientWidth;
    const nextHeight = container.clientHeight;

    setViewport((prev) => {
      if (prev.width === nextWidth && prev.height === nextHeight) {
        return prev;
      }
      return {
        width: nextWidth,
        height: nextHeight,
      };
    });
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(container);
    updateViewport();

    return () => {
      observer.disconnect();
    };
  }, [updateViewport]);

  return {
    containerRef,
    viewport,
    handleScroll: updateViewport,
  };
}
