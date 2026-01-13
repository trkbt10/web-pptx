/**
 * @file TrueType/OpenType font parser
 *
 * Parses TrueType table directory and provides utilities for font inspection.
 *
 * @see OpenType spec: https://docs.microsoft.com/en-us/typography/opentype/spec/
 */

/**
 * Table directory entry from TrueType font.
 */
export type TableEntry = {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
};

/**
 * Parse TrueType table directory.
 *
 * @param fontData - Raw TrueType font data
 * @returns Array of table entries, or empty array if not a valid TrueType font
 */
export function parseTrueTypeTableDirectory(fontData: Uint8Array): TableEntry[] {
  if (fontData.length < 12) {
    return [];
  }

  const view = new DataView(fontData.buffer, fontData.byteOffset, fontData.byteLength);

  // Check magic (TrueType or OpenType)
  const magic = view.getUint32(0, false);
  if (magic !== 0x00010000 && magic !== 0x4F54544F) {
    // Not TrueType (0x00010000) or OpenType (OTTO)
    return [];
  }

  const numTables = view.getUint16(4, false);
  const tables: TableEntry[] = [];

  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16;
    if (offset + 16 > fontData.length) break;

    const tag = String.fromCharCode(
      fontData[offset],
      fontData[offset + 1],
      fontData[offset + 2],
      fontData[offset + 3]
    );
    const checksum = view.getUint32(offset + 4, false);
    const tableOffset = view.getUint32(offset + 8, false);
    const length = view.getUint32(offset + 12, false);

    tables.push({ tag, checksum, offset: tableOffset, length });
  }

  return tables;
}

/**
 * Check if font data has a specific table.
 */
export function hasTable(fontData: Uint8Array, tag: string): boolean {
  const tables = parseTrueTypeTableDirectory(fontData);
  return tables.some((t) => t.tag === tag);
}

/**
 * Get list of table tags present in the font.
 */
export function getTableTags(fontData: Uint8Array): string[] {
  const tables = parseTrueTypeTableDirectory(fontData);
  return tables.map((t) => t.tag);
}

/**
 * Calculate OpenType table checksum.
 */
export function calculateTableChecksum(data: Uint8Array): number {
  let sum = 0;
  const paddedLength = (data.length + 3) & ~3;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  const view = new DataView(padded.buffer);

  for (let i = 0; i < paddedLength; i += 4) {
    sum = (sum + view.getUint32(i, false)) >>> 0;
  }

  return sum;
}
