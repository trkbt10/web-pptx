/**
 * @file PPTX Exporter
 *
 * Main API for exporting PresentationDocument to PPTX format.
 * Uses ZipPackage for unified ZIP handling (shared with pptx-loader).
 *
 * Phase 1 (MVP): Simple pass-through - exports the original PPTX with updated XML.
 *
 * @see src/pptx/opc/zip-package.ts - Shared ZIP abstraction
 * @see src/pptx/app/pptx-loader.ts - Corresponding load functionality
 */

import type { PresentationDocument } from "../app/presentation-document";
import type { PresentationFile } from "../domain";
import { serializeDocument } from "../../xml";
import {
  createEmptyZipPackage,
  isBinaryFile,
  type ZipPackage,
  type ZipGenerateOptions,
} from "../opc/zip-package";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for PPTX export
 */
export type ExportOptions = {
  /** Compression level (0-9, default: 6) */
  readonly compressionLevel?: number;
};

/**
 * Result of PPTX export
 */
export type ExportResult = {
  /** Generated PPTX as Blob */
  readonly blob: Blob;
  /** Size in bytes */
  readonly size: number;
};

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a PresentationDocument to PPTX format.
 *
 * Phase 1 (MVP): Passes through the original PPTX, updating slide XML from apiSlide.content.
 *
 * @example
 * ```typescript
 * const result = await exportPptx(document);
 * // Download the file
 * const url = URL.createObjectURL(result.blob);
 * const a = document.createElement("a");
 * a.href = url;
 * a.download = "presentation.pptx";
 * a.click();
 * ```
 */
export async function exportPptx(
  doc: PresentationDocument,
  options: ExportOptions = {},
): Promise<ExportResult> {
  // Validate that we have a source presentation file
  if (!doc.presentationFile) {
    throw new Error("PresentationDocument must have a presentationFile for export");
  }

  // Create a ZipPackage and copy all files from source
  const pkg = copyPresentationFileToPackage(doc.presentationFile);

  // Update slide XMLs from apiSlide.content
  for (const slideWithId of doc.slides) {
    if (slideWithId.apiSlide) {
      const slidePath = `ppt/slides/${slideWithId.apiSlide.filename}.xml`;
      const xml = serializeDocument(slideWithId.apiSlide.content, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(slidePath, xml);
    }
  }

  // Generate the PPTX
  const blob = await pkg.toBlob({
    compressionLevel: options.compressionLevel,
  });

  return {
    blob,
    size: blob.size,
  };
}

/**
 * Export a PresentationDocument to PPTX as ArrayBuffer.
 *
 * Useful for Node.js environments or when you need to process the buffer further.
 */
export async function exportPptxAsBuffer(
  doc: PresentationDocument,
  options: ExportOptions = {},
): Promise<ArrayBuffer> {
  if (!doc.presentationFile) {
    throw new Error("PresentationDocument must have a presentationFile for export");
  }

  const pkg = copyPresentationFileToPackage(doc.presentationFile);

  for (const slideWithId of doc.slides) {
    if (slideWithId.apiSlide) {
      const slidePath = `ppt/slides/${slideWithId.apiSlide.filename}.xml`;
      const xml = serializeDocument(slideWithId.apiSlide.content, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(slidePath, xml);
    }
  }

  return pkg.toArrayBuffer({
    compressionLevel: options.compressionLevel,
  });
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Copy all files from PresentationFile to a new ZipPackage.
 *
 * This creates a new package with all the original content,
 * which can then be modified before export.
 */
function copyPresentationFileToPackage(file: PresentationFile): ZipPackage {
  // Require listFiles() for proper export
  if (!file.listFiles) {
    throw new Error(
      "PresentationFile must implement listFiles() for export. " +
        "Ensure the file was loaded using loadPptxFromBuffer or similar.",
    );
  }

  const pkg = createEmptyZipPackage();
  const paths = file.listFiles();

  for (const path of paths) {
    if (isBinaryFile(path)) {
      const content = file.readBinary(path);
      if (content) {
        pkg.writeBinary(path, content);
      }
    } else {
      const content = file.readText(path);
      if (content) {
        pkg.writeText(path, content);
      }
    }
  }

  return pkg;
}
