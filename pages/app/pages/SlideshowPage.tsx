/**
 * @file SlideshowPage
 *
 * Full-screen slideshow presentation viewer with animation support.
 */

import { useCallback } from "react";
import type { LoadedPresentation } from "@lib/pptx/app";
import { PresentationSlideshow } from "@lib/pptx-editor";

type Props = {
  presentation: LoadedPresentation;
  startSlide: number;
  onExit: () => void;
};

/**
 * Full-screen slideshow presentation viewer.
 */
export function SlideshowPage({ presentation, startSlide, onExit }: Props) {
  const { presentation: pres } = presentation;

  const getSlideContent = useCallback(
    (slideIndex: number) => {
      const slide = pres.getSlide(slideIndex);
      return {
        svg: slide.renderSVG(),
        timing: slide.timing,
        transition: slide.transition,
      };
    },
    [pres],
  );

  return (
    <PresentationSlideshow
      slideCount={pres.count}
      slideSize={pres.size}
      startSlideIndex={startSlide}
      getSlideContent={getSlideContent}
      onExit={onExit}
    />
  );
}
