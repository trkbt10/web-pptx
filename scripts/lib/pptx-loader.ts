/**
 * @file Common PPTX file loading utilities for scripts and tests
 *
 * This module provides a shared implementation for loading PPTX files
 * using JSZip. It should be used by all scripts and integration tests
 * that need to load PPTX files.
 *
 * Usage:
 * ```typescript
 * import { loadPptxFile } from "../scripts/lib/pptx-loader";
 *
 * const presentationFile = await loadPptxFile("path/to/file.pptx");
 * const presentation = openPresentation(presentationFile);
 * ```
 */

import * as fs from "node:fs";
import JSZip from "jszip";
import type { PresentationFile } from "../../src/pptx";

/**
 * File cache entry containing both text and binary representations
 */
type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

/**
 * Load a PPTX file and return a PresentationFile interface.
 *
 * This function reads the PPTX file, extracts all contents using JSZip,
 * and returns an object implementing the PresentationFile interface.
 *
 * @param filePath - Path to the PPTX file
 * @returns PresentationFile interface for use with openPresentation()
 */
export async function loadPptxFile(filePath: string): Promise<PresentationFile> {
  const pptxBuffer = fs.readFileSync(filePath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache: FileCache = new Map();
  const files = Object.keys(jszip.files);

  for (const fp of files) {
    const file = jszip.file(fp);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(fp, { text, buffer });
    }
  }

  return {
    readText(fp: string): string | null {
      return cache.get(fp)?.text ?? null;
    },
    readBinary(fp: string): ArrayBuffer | null {
      return cache.get(fp)?.buffer ?? null;
    },
    exists(fp: string): boolean {
      return cache.has(fp);
    },
  };
}

/**
 * Load a PPTX file synchronously by first reading from disk,
 * then asynchronously processing with JSZip.
 *
 * This is a convenience wrapper that checks if the file exists
 * before attempting to load it.
 *
 * @param filePath - Path to the PPTX file
 * @returns PresentationFile or null if file doesn't exist
 */
export async function tryLoadPptxFile(filePath: string): Promise<PresentationFile | null> {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return loadPptxFile(filePath);
}
