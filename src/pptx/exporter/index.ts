/**
 * @file PPTX Exporter Module
 *
 * Exports PresentationDocument to PPTX format.
 *
 * @see src/pptx/opc/zip-package.ts - Shared ZIP abstraction
 * @see src/pptx/app/pptx-loader.ts - Corresponding load functionality
 */

// =============================================================================
// Exporter
// =============================================================================

export type { ExportOptions, ExportResult } from "./pptx-exporter";
export { exportPptx, exportPptxAsBuffer } from "./pptx-exporter";

// =============================================================================
// ZIP Package (Re-exported from opc for convenience)
// =============================================================================

export type { ZipPackage, ZipGenerateOptions } from "../opc/zip-package";
export {
  loadZipPackage,
  createEmptyZipPackage,
  isBinaryFile,
} from "../opc/zip-package";
