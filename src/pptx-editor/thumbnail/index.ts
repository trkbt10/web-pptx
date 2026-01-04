/**
 * @file Thumbnail rendering components
 *
 * Components for rendering individual slide thumbnails:
 * - SlideThumbnailPreview: SVG preview component
 * - useSlideThumbnails: Hook for cached thumbnail generation
 * - cache utilities: Thumbnail cache management
 */

export { SlideThumbnailPreview } from "./SlideThumbnailPreview";
export type { SlideThumbnailPreviewProps } from "./SlideThumbnailPreview";

export { useSlideThumbnails } from "./use-slide-thumbnails";
export type { UseSlideThumbnailsOptions, SlideThumbnailRenderer } from "./use-slide-thumbnails";

export {
  createThumbnailCache,
  getCachedThumbnail,
  setCachedThumbnail,
  pruneCacheForSlideIds,
} from "./cache";
export type { ThumbnailCache, ThumbnailCacheEntry } from "./cache";
