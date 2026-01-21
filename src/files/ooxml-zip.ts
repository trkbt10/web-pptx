/**
 * @file OOXML zip access helpers
 *
 * Wraps JSZip to provide a simple `(path) => text` accessor for OOXML packages.
 */

import JSZip from "jszip";

export type GetZipTextFileContent = (path: string) => Promise<string | undefined>;

/**
 * Create a function that reads text entries from an OOXML zip byte array.
 */
export async function createGetZipTextFileContentFromBytes(
  bytes: ArrayBuffer | Uint8Array,
): Promise<GetZipTextFileContent> {
  const zip = await JSZip.loadAsync(bytes);
  return async (path: string) => {
    const entry = zip.file(path);
    return entry ? await entry.async("text") : undefined;
  };
}
