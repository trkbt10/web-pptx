/**
 * @file Presentation document operations
 *
 * Pure functions for slide-level operations on presentation documents.
 */

import type { Slide } from "../../pptx/domain";
import type { ColorContext } from "../../pptx/domain/resolution";
import type { ResourceResolver } from "../../pptx/render/core";
import type { PresentationDocument, SlideWithId, SlideId } from "./types";

// =============================================================================
// Default Context Values
// =============================================================================

/**
 * Empty color context (no theme colors)
 */
const EMPTY_COLOR_CONTEXT: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

/**
 * Empty resource resolver (no resources)
 */
const EMPTY_RESOURCE_RESOLVER: ResourceResolver = {
  resolve: () => undefined,
  getMimeType: () => undefined,
  getFilePath: () => undefined,
  readFile: () => null,
  getResourceByType: () => undefined,
};

// =============================================================================
// Slide ID Generation
// =============================================================================

/**
 * Generate a unique slide ID
 */
export function generateSlideId(document: PresentationDocument): SlideId {
  let maxId = 0;
  for (const slideWithId of document.slides) {
    const numId = parseInt(slideWithId.id, 10);
    if (!isNaN(numId) && numId > maxId) {
      maxId = numId;
    }
  }
  return String(maxId + 1);
}

// =============================================================================
// Slide Query Operations
// =============================================================================

/**
 * Find slide by ID
 */
export function findSlideById(
  document: PresentationDocument,
  slideId: SlideId
): SlideWithId | undefined {
  return document.slides.find((s) => s.id === slideId);
}

/**
 * Get slide index by ID
 */
export function getSlideIndex(
  document: PresentationDocument,
  slideId: SlideId
): number {
  return document.slides.findIndex((s) => s.id === slideId);
}

// =============================================================================
// Slide Mutation Operations
// =============================================================================

/**
 * Add a slide to the document
 *
 * @param document - The document to add to
 * @param slide - The slide to add
 * @param afterSlideId - Insert after this slide (undefined = add at end)
 * @returns New document and the new slide's ID
 */
export function addSlide(
  document: PresentationDocument,
  slide: Slide,
  afterSlideId?: SlideId
): { document: PresentationDocument; newSlideId: SlideId } {
  const newSlideId = generateSlideId(document);
  const newSlideWithId: SlideWithId = { id: newSlideId, slide };

  let insertIndex = document.slides.length;
  if (afterSlideId !== undefined) {
    const afterIndex = getSlideIndex(document, afterSlideId);
    if (afterIndex !== -1) {
      insertIndex = afterIndex + 1;
    }
  }

  const newSlides = [
    ...document.slides.slice(0, insertIndex),
    newSlideWithId,
    ...document.slides.slice(insertIndex),
  ];

  return {
    document: { ...document, slides: newSlides },
    newSlideId,
  };
}

/**
 * Delete a slide from the document
 */
export function deleteSlide(
  document: PresentationDocument,
  slideId: SlideId
): PresentationDocument {
  const newSlides = document.slides.filter((s) => s.id !== slideId);
  return { ...document, slides: newSlides };
}

/**
 * Duplicate a slide
 *
 * @param document - The document
 * @param slideId - The slide to duplicate
 * @returns New document and the duplicated slide's ID
 */
export function duplicateSlide(
  document: PresentationDocument,
  slideId: SlideId
): { document: PresentationDocument; newSlideId: SlideId } | undefined {
  const sourceSlide = findSlideById(document, slideId);
  if (!sourceSlide) {
    return undefined;
  }

  // Deep clone the slide domain data
  const clonedSlide: Slide = JSON.parse(JSON.stringify(sourceSlide.slide));

  // Create new SlideWithId with same API slide and background as source
  const newSlideId = generateSlideId(document);
  const insertIndex = getSlideIndex(document, slideId) + 1;

  const newSlideWithId: SlideWithId = {
    id: newSlideId,
    slide: clonedSlide,
    apiSlide: sourceSlide.apiSlide, // Preserve API slide for rendering context
    resolvedBackground: sourceSlide.resolvedBackground,
  };

  const newSlides = [
    ...document.slides.slice(0, insertIndex),
    newSlideWithId,
    ...document.slides.slice(insertIndex),
  ];

  return {
    document: { ...document, slides: newSlides },
    newSlideId,
  };
}

/**
 * Move a slide to a new position
 */
export function moveSlide(
  document: PresentationDocument,
  slideId: SlideId,
  toIndex: number
): PresentationDocument {
  const currentIndex = getSlideIndex(document, slideId);
  if (currentIndex === -1 || currentIndex === toIndex) {
    return document;
  }

  const slides = [...document.slides];
  const [slide] = slides.splice(currentIndex, 1);
  slides.splice(toIndex, 0, slide);

  return { ...document, slides };
}

/**
 * Update a slide in the document
 */
export function updateSlide(
  document: PresentationDocument,
  slideId: SlideId,
  updater: (slide: Slide) => Slide
): PresentationDocument {
  const newSlides = document.slides.map((s) =>
    s.id === slideId ? { ...s, slide: updater(s.slide) } : s
  );
  return { ...document, slides: newSlides };
}

// =============================================================================
// Document Creation
// =============================================================================

/**
 * Create a presentation document from presentation settings and slides
 */
export function createDocumentFromPresentation(
  presentation: import("../../pptx/domain").Presentation,
  slides: readonly Slide[],
  slideWidth: import("../../pptx/domain/types").Pixels,
  slideHeight: import("../../pptx/domain/types").Pixels,
  colorContext: ColorContext = EMPTY_COLOR_CONTEXT,
  resources: ResourceResolver = EMPTY_RESOURCE_RESOLVER
): PresentationDocument {
  const slidesWithId: SlideWithId[] = slides.map((slide, index) => ({
    id: String(index + 1),
    slide,
  }));

  return {
    presentation,
    slides: slidesWithId,
    slideWidth,
    slideHeight,
    colorContext,
    resources,
  };
}

/**
 * Create an empty presentation document
 */
export function createEmptyDocument(
  slideWidth: import("../../pptx/domain/types").Pixels,
  slideHeight: import("../../pptx/domain/types").Pixels
): PresentationDocument {
  const emptySlide: Slide = { shapes: [] };
  const px = (v: number) => v as import("../../pptx/domain/types").Pixels;

  return {
    presentation: {
      slideSize: {
        width: px(slideWidth as number),
        height: px(slideHeight as number),
      },
    },
    slides: [{ id: "1", slide: emptySlide }],
    slideWidth,
    slideHeight,
    colorContext: EMPTY_COLOR_CONTEXT,
    resources: EMPTY_RESOURCE_RESOLVER,
  };
}
