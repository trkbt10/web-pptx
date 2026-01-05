/**
 * @file Slide transition hook
 *
 * Provides slide transition effects based on PPTX transition data.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Transitions)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { SlideTransition, TransitionType } from "../../../domain";

/**
 * Options for the slide transition hook.
 */
export type UseSlideTransitionOptions = {
  /** Current slide index (1-based) */
  slideIndex: number;
  /** Transition data for the current slide */
  transition: SlideTransition | undefined;
  /** Reference to the slide container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Callback when transition completes */
  onTransitionEnd?: () => void;
};

/**
 * Result of the slide transition hook.
 */
export type UseSlideTransitionResult = {
  /** Whether a transition is currently playing */
  isTransitioning: boolean;
  /** Skip the current transition */
  skipTransition: () => void;
};

/**
 * Map transition types to CSS animation classes.
 */
function getTransitionClass(type: TransitionType): string {
  switch (type) {
    case "fade":
      return "slide-transition-fade";
    case "push":
      return "slide-transition-push";
    case "wipe":
      return "slide-transition-wipe";
    case "blinds":
      return "slide-transition-blinds";
    case "dissolve":
      return "slide-transition-dissolve";
    case "circle":
      return "slide-transition-circle";
    case "diamond":
      return "slide-transition-diamond";
    case "split":
      return "slide-transition-split";
    case "zoom":
      return "slide-transition-zoom";
    case "cover":
      return "slide-transition-cover";
    case "pull":
      return "slide-transition-pull";
    case "cut":
      return "slide-transition-cut";
    default:
      return "slide-transition-fade";
  }
}

/**
 * Hook to manage slide transition effects.
 *
 * Applies CSS-based transition animations when the slide changes.
 */
export function useSlideTransition(
  options: UseSlideTransitionOptions,
): UseSlideTransitionResult {
  const { slideIndex, transition, containerRef, onTransitionEnd } = options;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousSlideRef = useRef(slideIndex);
  const timeoutRef = useRef<number | undefined>(undefined);

  const skipTransition = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    const container = containerRef.current;
    if (container) {
      // Remove all transition classes
      container.classList.remove(
        "slide-transition-fade",
        "slide-transition-push",
        "slide-transition-wipe",
        "slide-transition-blinds",
        "slide-transition-dissolve",
        "slide-transition-circle",
        "slide-transition-diamond",
        "slide-transition-split",
        "slide-transition-zoom",
        "slide-transition-cover",
        "slide-transition-pull",
        "slide-transition-cut",
        "slide-transition-active",
      );
    }

    setIsTransitioning(false);
    onTransitionEnd?.();
  }, [containerRef, onTransitionEnd]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Only trigger transition when slide actually changes
    if (previousSlideRef.current === slideIndex) {
      return;
    }
    previousSlideRef.current = slideIndex;

    // No transition for this slide
    if (!transition || transition.type === "none") {
      return;
    }

    // Apply transition
    const transitionClass = getTransitionClass(transition.type);
    const duration = transition.duration ?? 500;

    setIsTransitioning(true);

    // Add transition class
    container.classList.add(transitionClass, "slide-transition-active");
    container.style.setProperty("--transition-duration", `${duration}ms`);

    // Force reflow to restart animation
    void container.offsetWidth;

    // Remove class after animation completes
    timeoutRef.current = window.setTimeout(() => {
      container.classList.remove(transitionClass, "slide-transition-active");
      setIsTransitioning(false);
      onTransitionEnd?.();
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [slideIndex, transition, containerRef, onTransitionEnd]);

  return {
    isTransitioning,
    skipTransition,
  };
}
