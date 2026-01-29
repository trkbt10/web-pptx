/**
 * @file OPC (Open Packaging Conventions) utilities
 *
 * Common OPC utilities and types shared across all OOXML formats.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

export type { PackageFile, ZipEntry, ZipFile, ResourceMap } from "./types";

export {
  arePartNamesEquivalent,
  isValidPartName,
  assertValidPartName,
} from "./part-name";

export {
  parsePackIri,
  composePackIri,
  createPartBaseIri,
  arePackIrisEquivalent,
  getPackScheme,
} from "./pack-uri";
export type { PackResource } from "./pack-uri";

export { createEmptyResourceMap, createResourceMap } from "./relationships";
export type { ResourceEntry } from "./relationships";

export {
  basenamePosixPath,
  dirnamePosixPath,
  joinPosixPath,
  normalizePosixPath,
} from "./path";

export { createGetZipTextFileContentFromBytes } from "./zip";
export type { GetZipTextFileContent } from "./zip";

export { resolveRelationshipTargetPath } from "./relationship-target";

