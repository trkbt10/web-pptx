/**
 * @file ZIP Package - Unified ZIP handling for OPC packages
 *
 * This module is kept for backward compatibility.
 * The implementation lives in `src/zip/`.
 */

export type { ZipPackage, ZipGenerateOptions } from "../../zip";
export { loadZipPackage, createEmptyZipPackage, isBinaryFile } from "../../zip";

