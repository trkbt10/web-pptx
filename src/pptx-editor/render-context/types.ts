/**
 * @file Render-context file cache types
 *
 * Types for cached PPTX resources used when building render contexts.
 */

/**
 * File cache entry for PPTX content
 */
export type FileCacheEntry = {
  readonly text: string;
  readonly buffer: ArrayBuffer;
};

/**
 * File cache for PPTX resources (images, XML, etc.)
 */
export type FileCache = ReadonlyMap<string, FileCacheEntry>;
