/**
 * @file Presentation file abstraction
 * Allows any ZIP library implementation to be injected
 */

/**
 * Abstract type for reading presentation files.
 * Users can implement this with any ZIP library (fflate, pako, etc.)
 * or even a filesystem-based implementation for extracted archives.
 */
export type PresentationFile = {
  /**
   * Read an entry as text (UTF-8)
   * @param path - Entry path within the archive (e.g., "ppt/presentation.xml")
   * @returns Text content or null if entry doesn't exist
   */
  readText(path: string): string | null;

  /**
   * Read an entry as binary
   * @param path - Entry path within the archive (e.g., "ppt/media/image1.png")
   * @returns ArrayBuffer or null if entry doesn't exist
   */
  readBinary(path: string): ArrayBuffer | null;

  /**
   * Check if an entry exists
   * @param path - Entry path within the archive
   */
  exists(path: string): boolean;
};
