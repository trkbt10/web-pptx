/**
 * @file ZIP Package - Unified ZIP handling for OPC packages
 *
 * Provides a single abstraction for both reading and writing PPTX files.
 * Used by pptx-loader (input) and pptx-exporter (output).
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import JSZip from "jszip";
import type { PresentationFile } from "../domain";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for ZIP generation
 */
export type ZipGenerateOptions = {
  /** Compression level (0-9, default: 6) */
  readonly compressionLevel?: number;
  /** MIME type for the blob (default: PPTX MIME type) */
  readonly mimeType?: string;
};

/**
 * Unified ZIP package for both reading and writing.
 *
 * Read operations are compatible with PresentationFile interface.
 * Write operations allow modifying and exporting the package.
 */
export type ZipPackage = {
  // =========================================================================
  // Read Operations (PresentationFile compatible)
  // =========================================================================

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

  /**
   * List all file paths in the archive.
   * @returns Array of file paths (excludes directories)
   */
  listFiles(): readonly string[];

  // =========================================================================
  // Write Operations
  // =========================================================================

  /**
   * Add or update a text file in the package
   */
  writeText(path: string, content: string): void;

  /**
   * Add or update a binary file in the package
   */
  writeBinary(path: string, content: ArrayBuffer | Uint8Array): void;

  /**
   * Remove a file from the package
   */
  remove(path: string): void;

  // =========================================================================
  // Export Operations
  // =========================================================================

  /**
   * Generate the ZIP as a Blob
   */
  toBlob(options?: ZipGenerateOptions): Promise<Blob>;

  /**
   * Generate the ZIP as an ArrayBuffer
   */
  toArrayBuffer(options?: ZipGenerateOptions): Promise<ArrayBuffer>;

  // =========================================================================
  // Conversion
  // =========================================================================

  /**
   * Get as PresentationFile interface (read-only view)
   */
  asPresentationFile(): PresentationFile;
};

// =============================================================================
// Constants
// =============================================================================

const PPTX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/**
 * Binary file extensions in OPC packages.
 * These files should be read/written as binary, not text.
 */
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".wmf",
  ".emf",
  ".svg",
  ".bin",
  ".ole",
  ".vml",
  ".wav",
  ".mp3",
  ".mp4",
  ".m4a",
  ".wma",
  ".wmv",
  ".avi",
]);

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Load a ZIP package from a buffer.
 *
 * @example
 * ```typescript
 * const pkg = await loadZipPackage(arrayBuffer);
 * const xml = pkg.readText("ppt/presentation.xml");
 * ```
 */
export async function loadZipPackage(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ZipPackage> {
  const jszip = await JSZip.loadAsync(buffer);
  const cache = await preloadFiles(jszip);
  return createZipPackageFromCache(jszip, cache);
}

/**
 * Create an empty ZIP package.
 *
 * @example
 * ```typescript
 * const pkg = createEmptyZipPackage();
 * pkg.writeText("[Content_Types].xml", contentTypesXml);
 * ```
 */
export function createEmptyZipPackage(): ZipPackage {
  const jszip = new JSZip();
  const cache = new Map<string, CacheEntry>();
  return createZipPackageFromCache(jszip, cache);
}

// =============================================================================
// Internal Types
// =============================================================================

type CacheEntry = {
  text: string;
  buffer: ArrayBuffer;
};

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Preload all files from JSZip into memory cache.
 * This enables synchronous read operations.
 */
async function preloadFiles(jszip: JSZip): Promise<Map<string, CacheEntry>> {
  const cache = new Map<string, CacheEntry>();

  for (const [path, file] of Object.entries(jszip.files)) {
    if (!file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(path, { text, buffer });
    }
  }

  return cache;
}

/**
 * Create a ZipPackage from JSZip instance and cache.
 */
function createZipPackageFromCache(
  jszip: JSZip,
  cache: Map<string, CacheEntry>,
): ZipPackage {
  // Track dirty state for cache invalidation
  const dirty = new Set<string>();

  const pkg: ZipPackage = {
    // Read operations
    readText(path: string): string | null {
      // If dirty, read from JSZip (would need async, but we cached it)
      const entry = cache.get(path);
      return entry?.text ?? null;
    },

    readBinary(path: string): ArrayBuffer | null {
      const entry = cache.get(path);
      return entry?.buffer ?? null;
    },

    exists(path: string): boolean {
      return cache.has(path);
    },

    listFiles(): readonly string[] {
      return Array.from(cache.keys());
    },

    // Write operations
    writeText(path: string, content: string): void {
      jszip.file(path, content);
      // Update cache
      const encoder = new TextEncoder();
      const buffer = encoder.encode(content).buffer;
      cache.set(path, { text: content, buffer });
      dirty.add(path);
    },

    writeBinary(path: string, content: ArrayBuffer | Uint8Array): void {
      jszip.file(path, content);
      // Update cache - ensure we have ArrayBuffer (not SharedArrayBuffer)
      const buffer =
        content instanceof Uint8Array
          ? (content.buffer.slice(
              content.byteOffset,
              content.byteOffset + content.byteLength,
            ) as ArrayBuffer)
          : content;
      const text = new TextDecoder().decode(buffer);
      cache.set(path, { text, buffer });
      dirty.add(path);
    },

    remove(path: string): void {
      jszip.remove(path);
      cache.delete(path);
      dirty.delete(path);
    },

    // Export operations
    async toBlob(options: ZipGenerateOptions = {}): Promise<Blob> {
      const compressionLevel = options.compressionLevel ?? 6;
      const mimeType = options.mimeType ?? PPTX_MIME_TYPE;

      return jszip.generateAsync({
        type: "blob",
        mimeType,
        compression: compressionLevel > 0 ? "DEFLATE" : "STORE",
        compressionOptions: { level: compressionLevel },
      });
    },

    async toArrayBuffer(options: ZipGenerateOptions = {}): Promise<ArrayBuffer> {
      const compressionLevel = options.compressionLevel ?? 6;

      return jszip.generateAsync({
        type: "arraybuffer",
        compression: compressionLevel > 0 ? "DEFLATE" : "STORE",
        compressionOptions: { level: compressionLevel },
      });
    },

    // Conversion
    asPresentationFile(): PresentationFile {
      return {
        readText: (path) => pkg.readText(path),
        readBinary: (path) => pkg.readBinary(path),
        exists: (path) => pkg.exists(path),
        listFiles: () => pkg.listFiles(),
      };
    },
  };

  return pkg;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a file path is a binary file based on extension.
 */
export function isBinaryFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  const lastDot = lowerPath.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = lowerPath.slice(lastDot);
  return BINARY_EXTENSIONS.has(ext);
}
