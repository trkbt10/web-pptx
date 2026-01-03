/**
 * @file Presentation converter
 *
 * Converts LoadedPresentation (from pptx-loader) to PresentationDocument (for editor)
 */

import type { LoadedPresentation } from "./pptx-loader";
import type { PresentationDocument, SlideWithId } from "@lib/pptx-editor";
import type { Slide as DomainSlide, Presentation as DomainPresentation } from "@lib/pptx/domain";
import { parseSlide } from "@lib/pptx/parser/slide/slide-parser";

/**
 * Convert a LoadedPresentation to a PresentationDocument for the editor
 */
export function convertToPresentationDocument(loaded: LoadedPresentation): PresentationDocument {
  const { presentation } = loaded;
  const slideCount = presentation.count;
  const slideSize = presentation.size;

  // Convert each slide from API Slide to domain Slide
  const slides: SlideWithId[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const apiSlide = presentation.getSlide(i);
    // Parse the XML content to get the domain Slide
    const domainSlide = parseSlide(apiSlide.content);

    if (domainSlide) {
      slides.push({
        id: `slide-${i}`,
        slide: domainSlide,
      });
    }
  }

  // Create domain Presentation
  const domainPresentation: DomainPresentation = {
    slides: slides.map((s) => s.slide),
    slideSize,
  };

  return {
    presentation: domainPresentation,
    slides,
    slideWidth: slideSize.width,
    slideHeight: slideSize.height,
  };
}
