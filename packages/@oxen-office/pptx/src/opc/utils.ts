/**
 * @file OPC utility functions
 *
 * Shared utilities for resource resolution and data URL creation.
 * Based on ECMA-376 Part 2 (Open Packaging Conventions).
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 * @see RFC 3986 (Uniform Resource Identifier: Generic Syntax)
 */

// =============================================================================
// MIME Type Resolution
// =============================================================================

/**
 * Media MIME type mappings by file extension.
 * Based on common media types used in OOXML packages.
 *
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  wmf: "image/x-wmf",
  emf: "image/x-emf",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
  aac: "audio/aac",
  // Documents (embedded in PPTX)
  pdf: "application/pdf",
};

/**
 * Get MIME type from file path extension.
 *
 * @param path - File path
 * @returns MIME type or undefined if unknown
 */
export function getMimeTypeFromPath(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === undefined) {
    return undefined;
  }
  return MIME_TYPES[ext];
}

/**
 * Normalize a path within an OPC package.
 *
 * This is a higher-level function that handles common OOXML path patterns.
 * It assumes paths are relative to the package root or use "../" notation.
 *
 * @param path - Path to normalize
 * @returns Normalized path starting from package root (e.g., "ppt/...")
 */
export function normalizePath(path: string): string {
  // If already starts with ppt/, return as-is
  if (path.startsWith("ppt/")) {
    return path;
  }

  // Handle absolute paths (rare in OOXML)
  if (path.startsWith("/")) {
    return path.substring(1);
  }

  // Handle ../xxx patterns (assume base is under ppt/)
  // This is a fallback for cases where we don't have the source path
  if (path.startsWith("../")) {
    // Typical case: ../media/xxx.png from ppt/slides/slide1.xml
    // We can't resolve without knowing the source, but we can make an educated guess
    // that most references go to ppt/xxx
    return "ppt/" + path.substring(3);
  }

  return path;
}
