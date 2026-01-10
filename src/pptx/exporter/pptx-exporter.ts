/**
 * @file PPTX Exporter
 *
 * Main API for exporting PresentationDocument to PPTX format.
 * Uses ZipPackage for unified ZIP handling (shared with pptx-loader).
 *
 * Phase 1 (MVP): Simple pass-through - exports the original PPTX with updated XML.
 * Phase 10: Extended support for chart and embedded workbook updates.
 *
 * @see src/pptx/opc/zip-package.ts - Shared ZIP abstraction
 * @see src/pptx/app/pptx-loader.ts - Corresponding load functionality
 */

import type { PresentationDocument } from "../app/presentation-document";
import type { PresentationFile } from "../domain";
import type { XmlDocument } from "../../xml";
import { serializeDocument } from "../../xml";
import {
  createEmptyZipPackage,
  isBinaryFile,
  type ZipPackage,
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

/**
 * Chart update for export
 */
export type ChartUpdate = {
  /** Path to chart XML (e.g., "ppt/charts/chart1.xml") */
  readonly chartPath: string;
  /** Updated chart XML document */
  readonly chartXml: XmlDocument;
};

/**
 * Workbook (embedding) update for export
 */
export type WorkbookUpdate = {
  /** Path to workbook in PPTX (e.g., "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx") */
  readonly workbookPath: string;
  /** Updated workbook as binary buffer */
  readonly workbookBuffer: ArrayBuffer;
};

/**
 * Extended export options with chart and workbook updates
 */
export type ExtendedExportOptions = ExportOptions & {
  /** Chart updates to apply */
  readonly chartUpdates?: readonly ChartUpdate[];
  /** Workbook (embedding) updates to apply */
  readonly workbookUpdates?: readonly WorkbookUpdate[];
};

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a PresentationDocument to PPTX format.
 *
 * Phase 1 (MVP): Passes through the original PPTX, updating slide XML from apiSlide.content.
 * Phase 10: Supports chart XML and embedded workbook updates via ExtendedExportOptions.
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
 *
 * @example With chart updates (Phase 10)
 * ```typescript
 * const result = await exportPptx(document, {
 *   chartUpdates: [
 *     { chartPath: "ppt/charts/chart1.xml", chartXml: updatedChartXml }
 *   ],
 *   workbookUpdates: [
 *     { workbookPath: "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx", workbookBuffer: updatedXlsx }
 *   ]
 * });
 * ```
 */
export async function exportPptx(
  doc: PresentationDocument,
  options: ExtendedExportOptions = {},
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

  // Phase 10: Apply chart updates
  if (options.chartUpdates) {
    for (const update of options.chartUpdates) {
      const xml = serializeDocument(update.chartXml, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(update.chartPath, xml);
    }
  }

  // Phase 10: Apply workbook (embedding) updates
  if (options.workbookUpdates) {
    for (const update of options.workbookUpdates) {
      pkg.writeBinary(update.workbookPath, update.workbookBuffer);
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
 * Supports the same extended options as exportPptx for chart and workbook updates.
 */
export async function exportPptxAsBuffer(
  doc: PresentationDocument,
  options: ExtendedExportOptions = {},
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

  // Phase 10: Apply chart updates
  if (options.chartUpdates) {
    for (const update of options.chartUpdates) {
      const xml = serializeDocument(update.chartXml, {
        declaration: true,
        standalone: true,
      });
      pkg.writeText(update.chartPath, xml);
    }
  }

  // Phase 10: Apply workbook (embedding) updates
  if (options.workbookUpdates) {
    for (const update of options.workbookUpdates) {
      pkg.writeBinary(update.workbookPath, update.workbookBuffer);
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
