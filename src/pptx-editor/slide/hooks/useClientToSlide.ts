/**
 * @file Client to slide coordinate conversion hook
 *
 * Shared hook for converting client (mouse) coordinates to slide coordinates.
 */

import { useCallback } from "react";
import type { Pixels } from "../../../pptx/domain/types";
import { clientToSlideCoords } from "../shape/coords";

// =============================================================================
// Types
// =============================================================================

export type UseClientToSlideOptions = {
  /** Slide width in domain units */
  readonly width: Pixels;
  /** Slide height in domain units */
  readonly height: Pixels;
  /** Container element ref for coordinate calculation */
  readonly containerRef: React.RefObject<HTMLElement | null>;
};

export type ClientToSlideFn = (
  clientX: number,
  clientY: number
) => { x: number; y: number } | null;

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for converting client coordinates to slide coordinates.
 *
 * This eliminates duplication across useDragMove, useDragResize, and useDragRotate.
 */
export function useClientToSlide({
  width,
  height,
  containerRef,
}: UseClientToSlideOptions): ClientToSlideFn {
  return useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      return clientToSlideCoords(
        clientX,
        clientY,
        rect,
        width as number,
        height as number
      );
    },
    [width, height, containerRef]
  );
}
