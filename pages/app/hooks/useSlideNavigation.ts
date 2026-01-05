/**
 * @file useSlideNavigation
 *
 * Shared hook for slide navigation state and actions.
 * Used by both SlideViewer and SlideshowPage.
 */

import { useState, useCallback, useMemo } from "react";

type UseSlideNavigationOptions = {
  totalSlides: number;
  initialSlide?: number;
  onSlideChange?: (slideNumber: number) => void;
};

type SlideNavigationResult = {
  currentSlide: number;
  totalSlides: number;
  progress: number;
  isFirst: boolean;
  isLast: boolean;
  goToNext: () => void;
  goToPrev: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  goToSlide: (num: number) => void;
  setCurrentSlide: (num: number) => void;
};

/**
 * Hook for managing slide navigation state.
 *
 * Provides:
 * - Current slide state
 * - Navigation actions (next, prev, first, last, goTo)
 * - Progress percentage
 * - Boundary checks (isFirst, isLast)
 */
export function useSlideNavigation({
  totalSlides,
  initialSlide = 1,
  onSlideChange,
}: UseSlideNavigationOptions): SlideNavigationResult {
  const [currentSlide, setCurrentSlideInternal] = useState(initialSlide);

  const setCurrentSlide = useCallback(
    (num: number) => {
      const target = Math.max(1, Math.min(totalSlides, num));
      setCurrentSlideInternal(target);
      onSlideChange?.(target);
    },
    [totalSlides, onSlideChange]
  );

  const goToNext = useCallback(() => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide, totalSlides, setCurrentSlide]);

  const goToPrev = useCallback(() => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide, setCurrentSlide]);

  const goToFirst = useCallback(() => {
    setCurrentSlide(1);
  }, [setCurrentSlide]);

  const goToLast = useCallback(() => {
    setCurrentSlide(totalSlides);
  }, [totalSlides, setCurrentSlide]);

  const goToSlide = useCallback(
    (num: number) => {
      setCurrentSlide(num);
    },
    [setCurrentSlide]
  );

  const derived = useMemo(
    () => ({
      progress: (currentSlide / totalSlides) * 100,
      isFirst: currentSlide === 1,
      isLast: currentSlide === totalSlides,
    }),
    [currentSlide, totalSlides]
  );

  return {
    currentSlide,
    totalSlides,
    ...derived,
    goToNext,
    goToPrev,
    goToFirst,
    goToLast,
    goToSlide,
    setCurrentSlide,
  };
}
