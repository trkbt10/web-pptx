/**
 * @file Common PPTX file loading utilities for scripts and tests
 *
 * This module provides a shared implementation for loading PPTX files
 * using ZipPackage. It should be used by all scripts and integration tests
 * that need to load PPTX files.
 *
 * Usage:
 * ```typescript
 * import { loadPptxFile } from "../scripts/lib/pptx-loader";
 *
 * const { zipPackage, presentationFile } = await loadPptxFile("path/to/file.pptx");
 *
 * // Read files directly from zipPackage
 * const slideXml = zipPackage.readText("ppt/slides/slide1.xml");
 *
 * // Or use presentationFile for parsing
 * const presentation = openPresentation(presentationFile);
 * ```
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer, type PptxFileBundle } from "@oxen/pptx/app/pptx-loader";

export type { PptxFileBundle } from "@oxen/pptx/app/pptx-loader";
export type { ZipPackage } from "@oxen/zip";

/**
 * Load a PPTX file and return the bundle containing ZipPackage and PresentationFile.
 *
 * @param filePath - Path to the PPTX file
 * @returns PptxFileBundle containing { zipPackage, presentationFile }
 */
export async function loadPptxFile(filePath: string): Promise<PptxFileBundle> {
  if (!filePath) {
    throw new Error("filePath is required");
  }
  const pptxBuffer = await fs.readFile(filePath);
  return loadPptxBundleFromBuffer(pptxBuffer);
}
