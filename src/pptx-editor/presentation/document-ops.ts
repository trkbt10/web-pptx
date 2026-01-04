/**
 * @file Presentation document operations
 *
 * Pure functions for slide-level operations on presentation documents.
 */

import type { Slide, Presentation } from "../../pptx/domain";
import type { Pixels } from "../../pptx/domain/types";
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
 * Find maximum numeric ID from slides
 */
function findMaxNumericId(slides: readonly SlideWithId[]): number {
  return slides.reduce((max, slide) => {
    const numId = parseInt(slide.id, 10);
    return !isNaN(numId) && numId > max ? numId : max;
  }, 0);
}

/**
 * Generate a unique slide ID
 */
export function generateSlideId(document: PresentationDocument): SlideId {
  return String(findMaxNumericId(document.slides) + 1);
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
 * Get insert index for adding a slide
 */
function getInsertIndex(
  document: PresentationDocument,
  afterSlideId: SlideId | undefined
): number {
  if (afterSlideId === undefined) {
    return document.slides.length;
  }
  const afterIndex = getSlideIndex(document, afterSlideId);
  return afterIndex === -1 ? document.slides.length : afterIndex + 1;
}

/**
 * Insert slide at specified index
 */
function insertSlideAt(
  slides: readonly SlideWithId[],
  slide: SlideWithId,
  index: number
): SlideWithId[] {
  return [...slides.slice(0, index), slide, ...slides.slice(index)];
}

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
  const insertIndex = getInsertIndex(document, afterSlideId);
  const newSlides = insertSlideAt(document.slides, newSlideWithId, insertIndex);

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
 * Create a duplicated slide with new ID
 */
function createDuplicatedSlide(
  sourceSlide: SlideWithId,
  newSlideId: SlideId
): SlideWithId {
  const clonedSlide: Slide = JSON.parse(JSON.stringify(sourceSlide.slide));
  return {
    id: newSlideId,
    slide: clonedSlide,
    apiSlide: sourceSlide.apiSlide,
    resolvedBackground: sourceSlide.resolvedBackground,
  };
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

  const newSlideId = generateSlideId(document);
  const insertIndex = getSlideIndex(document, slideId) + 1;
  const newSlideWithId = createDuplicatedSlide(sourceSlide, newSlideId);
  const newSlides = insertSlideAt(document.slides, newSlideWithId, insertIndex);

  return {
    document: { ...document, slides: newSlides },
    newSlideId,
  };
}

/**
 * Move element in array from one index to another (immutable)
 */
function moveElementInArray<T>(
  array: readonly T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const element = array[fromIndex];
  const withoutElement = [
    ...array.slice(0, fromIndex),
    ...array.slice(fromIndex + 1),
  ];
  return [
    ...withoutElement.slice(0, toIndex),
    element,
    ...withoutElement.slice(toIndex),
  ];
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

  const slides = moveElementInArray(document.slides, currentIndex, toIndex);
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
 * Convert slides to SlideWithId array with sequential IDs
 */
function assignSlideIds(slides: readonly Slide[]): SlideWithId[] {
  return slides.map((slide, index) => ({
    id: String(index + 1),
    slide,
  }));
}

/**
 * Create a presentation document from presentation settings and slides
 */
export function createDocumentFromPresentation(
  presentation: Presentation,
  slides: readonly Slide[],
  slideWidth: Pixels,
  slideHeight: Pixels,
  colorContext: ColorContext = EMPTY_COLOR_CONTEXT,
  resources: ResourceResolver = EMPTY_RESOURCE_RESOLVER
): PresentationDocument {
  return {
    presentation,
    slides: assignSlideIds(slides),
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
  slideWidth: Pixels,
  slideHeight: Pixels
): PresentationDocument {
  const emptySlide: Slide = { shapes: [] };

  return {
    presentation: {
      slideSize: { width: slideWidth, height: slideHeight },
    },
    slides: [{ id: "1", slide: emptySlide }],
    slideWidth,
    slideHeight,
    colorContext: EMPTY_COLOR_CONTEXT,
    resources: EMPTY_RESOURCE_RESOLVER,
  };
}
