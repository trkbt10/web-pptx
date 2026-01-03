/**
 * @file Coordinate conversion
 *
 * Utilities for converting between client and slide coordinate systems.
 */

/**
 * Convert client (mouse) coordinates to slide coordinates.
 *
 * This is the unified coordinate conversion used throughout the editor.
 *
 * @param clientX - Client X coordinate
 * @param clientY - Client Y coordinate
 * @param containerRect - Container element's bounding rect
 * @param slideWidth - Slide width in domain units
 * @param slideHeight - Slide height in domain units
 * @returns Slide coordinates
 */
export function clientToSlideCoords(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  slideWidth: number,
  slideHeight: number
): { x: number; y: number } {
  const scaleX = slideWidth / containerRect.width;
  const scaleY = slideHeight / containerRect.height;

  return {
    x: (clientX - containerRect.left) * scaleX,
    y: (clientY - containerRect.top) * scaleY,
  };
}
