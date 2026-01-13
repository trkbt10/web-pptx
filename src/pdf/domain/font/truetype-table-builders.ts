/**
 * @file TrueType table builders
 *
 * Builds individual TrueType/OpenType tables for web font compatibility.
 * PDF-embedded fonts often lack tables required by browsers.
 *
 * @see OpenType spec: https://docs.microsoft.com/en-us/typography/opentype/spec/
 */

import { parseTrueTypeTableDirectory } from "./truetype-parser";

/**
 * Build a cmap table with format 4 subtable for BMP characters.
 *
 * Format 4 is the most widely supported format for Unicode BMP.
 *
 * @param unicodeToGlyph - Map of Unicode code point to glyph ID
 */
export function buildCmapTable(unicodeToGlyph: Map<number, number>): Uint8Array {
  // Sort entries by Unicode code point
  const entries = Array.from(unicodeToGlyph.entries())
    .filter(([cp]) => cp <= 0xFFFF) // BMP only for format 4
    .sort((a, b) => a[0] - b[0]);

  if (entries.length === 0) {
    return buildMinimalCmap();
  }

  // Build segments for format 4
  const segments: Segment[] = [];
  let currentSegment: Segment | null = null;

  for (const [codePoint, glyphId] of entries) {
    if (currentSegment === null) {
      currentSegment = {
        startCode: codePoint,
        endCode: codePoint,
        idDelta: glyphId - codePoint,
        glyphIds: [glyphId],
      };
    } else if (
      codePoint === currentSegment.endCode + 1 &&
      glyphId - codePoint === currentSegment.idDelta
    ) {
      currentSegment.endCode = codePoint;
      currentSegment.glyphIds.push(glyphId);
    } else if (codePoint === currentSegment.endCode + 1) {
      currentSegment.endCode = codePoint;
      currentSegment.glyphIds.push(glyphId);
      currentSegment.idDelta = 0;
    } else {
      segments.push(currentSegment);
      currentSegment = {
        startCode: codePoint,
        endCode: codePoint,
        idDelta: glyphId - codePoint,
        glyphIds: [glyphId],
      };
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  // Add terminating segment
  segments.push({
    startCode: 0xFFFF,
    endCode: 0xFFFF,
    idDelta: 1,
    glyphIds: [],
  });

  return buildFormat4Subtable(segments);
}

type Segment = {
  startCode: number;
  endCode: number;
  idDelta: number;
  glyphIds: number[];
};

function buildMinimalCmap(): Uint8Array {
  const segments = [{
    startCode: 0xFFFF,
    endCode: 0xFFFF,
    idDelta: 1,
    glyphIds: [] as number[],
  }];
  return buildFormat4Subtable(segments);
}

function buildFormat4Subtable(segments: Segment[]): Uint8Array {
  const segCount = segments.length;

  const glyphIdArrays: number[][] = [];
  for (const seg of segments) {
    if (seg.idDelta === 0 && seg.glyphIds.length > 0) {
      glyphIdArrays.push(seg.glyphIds);
    } else {
      glyphIdArrays.push([]);
    }
  }

  const format4HeaderSize = 14;
  const segmentArraysSize = segCount * 2 * 4 + 2;
  const glyphIdArraySize = glyphIdArrays.reduce((sum, arr) => sum + arr.length * 2, 0);
  const format4Size = format4HeaderSize + segmentArraysSize + glyphIdArraySize;

  const cmapHeaderSize = 4 + 8;
  const totalSize = cmapHeaderSize + format4Size;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);
  let offset = 0;

  // cmap header
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 1, false);
  offset += 2;

  // Encoding record
  view.setUint16(offset, 3, false);
  offset += 2;
  view.setUint16(offset, 1, false);
  offset += 2;
  view.setUint32(offset, cmapHeaderSize, false);
  offset += 4;

  // Format 4 subtable
  view.setUint16(offset, 4, false);
  offset += 2;
  view.setUint16(offset, format4Size, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, segCount * 2, false);
  offset += 2;

  const searchRange = 2 * Math.pow(2, Math.floor(Math.log2(segCount)));
  const entrySelector = Math.floor(Math.log2(segCount));
  const rangeShift = 2 * segCount - searchRange;

  view.setUint16(offset, searchRange, false);
  offset += 2;
  view.setUint16(offset, entrySelector, false);
  offset += 2;
  view.setUint16(offset, rangeShift, false);
  offset += 2;

  // endCode array
  for (const seg of segments) {
    view.setUint16(offset, seg.endCode, false);
    offset += 2;
  }

  // reservedPad
  view.setUint16(offset, 0, false);
  offset += 2;

  // startCode array
  for (const seg of segments) {
    view.setUint16(offset, seg.startCode, false);
    offset += 2;
  }

  // idDelta array
  for (const seg of segments) {
    view.setInt16(offset, seg.idDelta, false);
    offset += 2;
  }

  // idRangeOffset array
  const glyphIdArrayOffset = segCount * 2;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.idDelta === 0 && seg.glyphIds.length > 0) {
      let arrayOffset = 0;
      for (let j = 0; j < i; j++) {
        arrayOffset += glyphIdArrays[j].length * 2;
      }
      const rangeOffset = glyphIdArrayOffset + arrayOffset - (i * 2);
      view.setUint16(offset, rangeOffset, false);
    } else {
      view.setUint16(offset, 0, false);
    }
    offset += 2;
  }

  // glyphIdArray
  for (const arr of glyphIdArrays) {
    for (const glyphId of arr) {
      view.setUint16(offset, glyphId, false);
      offset += 2;
    }
  }

  return data;
}

/**
 * Build a minimal OS/2 table.
 *
 * @see https://docs.microsoft.com/en-us/typography/opentype/spec/os2
 */
export function buildOS2Table(fontData: Uint8Array): Uint8Array {
  const tables = parseTrueTypeTableDirectory(fontData);
  const view = new DataView(fontData.buffer, fontData.byteOffset, fontData.byteLength);

  const headTable = tables.find((t) => t.tag === "head");
  let unitsPerEm = 1000;
  if (headTable && headTable.offset + 18 <= fontData.length) {
    unitsPerEm = view.getUint16(headTable.offset + 18, false);
  }

  const hheaTable = tables.find((t) => t.tag === "hhea");
  let ascender = Math.round(unitsPerEm * 0.8);
  let descender = Math.round(unitsPerEm * -0.2);
  if (hheaTable && hheaTable.offset + 8 <= fontData.length) {
    ascender = view.getInt16(hheaTable.offset + 4, false);
    descender = view.getInt16(hheaTable.offset + 6, false);
  }

  const os2Size = 96;
  const buffer = new ArrayBuffer(os2Size);
  const os2View = new DataView(buffer);
  let offset = 0;

  os2View.setUint16(offset, 4, false); offset += 2; // version
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.5), false); offset += 2; // xAvgCharWidth
  os2View.setUint16(offset, 400, false); offset += 2; // usWeightClass
  os2View.setUint16(offset, 5, false); offset += 2; // usWidthClass
  os2View.setUint16(offset, 0, false); offset += 2; // fsType
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.65), false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.6), false); offset += 2;
  os2View.setInt16(offset, 0, false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.075), false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.65), false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.6), false); offset += 2;
  os2View.setInt16(offset, 0, false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.35), false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.05), false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.3), false); offset += 2;
  os2View.setInt16(offset, 0, false); offset += 2; // sFamilyClass
  offset += 10; // panose
  os2View.setUint32(offset, 0x00000003, false); offset += 4;
  os2View.setUint32(offset, 0x10000000, false); offset += 4;
  os2View.setUint32(offset, 0x00000000, false); offset += 4;
  os2View.setUint32(offset, 0x00000000, false); offset += 4;
  os2View.setUint8(offset++, 0x4E);
  os2View.setUint8(offset++, 0x4F);
  os2View.setUint8(offset++, 0x4E);
  os2View.setUint8(offset++, 0x45);
  os2View.setUint16(offset, 0x0040, false); offset += 2; // fsSelection
  os2View.setUint16(offset, 0x0020, false); offset += 2;
  os2View.setUint16(offset, 0xFFFF, false); offset += 2;
  os2View.setInt16(offset, ascender, false); offset += 2;
  os2View.setInt16(offset, descender, false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.1), false); offset += 2;
  os2View.setUint16(offset, Math.max(0, ascender), false); offset += 2;
  os2View.setUint16(offset, Math.abs(descender), false); offset += 2;
  os2View.setUint32(offset, 0x00000001, false); offset += 4;
  os2View.setUint32(offset, 0x00000000, false); offset += 4;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.5), false); offset += 2;
  os2View.setInt16(offset, Math.round(unitsPerEm * 0.7), false); offset += 2;
  os2View.setUint16(offset, 0, false); offset += 2;
  os2View.setUint16(offset, 0x0020, false); offset += 2;
  os2View.setUint16(offset, 0, false); offset += 2;

  return new Uint8Array(buffer);
}

/**
 * Build a minimal name table.
 *
 * @see https://docs.microsoft.com/en-us/typography/opentype/spec/name
 */
export function buildNameTable(fontName: string): Uint8Array {
  const names = [
    { id: 0, value: "Embedded Font" },
    { id: 1, value: fontName },
    { id: 2, value: "Regular" },
    { id: 3, value: `${fontName};1.0` },
    { id: 4, value: fontName },
    { id: 5, value: "Version 1.0" },
    { id: 6, value: fontName.replace(/\s+/g, "") },
  ];

  const headerSize = 6;
  const recordSize = 12;
  const recordCount = names.length * 2;
  const stringOffset = headerSize + recordCount * recordSize;

  const stringParts: { offset: number; data: Uint8Array }[] = [];
  let currentStringOffset = 0;

  for (const name of names) {
    const utf16Data = new Uint8Array(name.value.length * 2);
    for (let i = 0; i < name.value.length; i++) {
      const code = name.value.charCodeAt(i);
      utf16Data[i * 2] = (code >> 8) & 0xFF;
      utf16Data[i * 2 + 1] = code & 0xFF;
    }
    stringParts.push({ offset: currentStringOffset, data: utf16Data });
    currentStringOffset += utf16Data.length;
  }

  const totalSize = stringOffset + currentStringOffset;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);

  view.setUint16(0, 0, false);
  view.setUint16(2, recordCount, false);
  view.setUint16(4, stringOffset, false);

  let recordOffset = headerSize;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const stringPart = stringParts[i];

    view.setUint16(recordOffset, 3, false);
    view.setUint16(recordOffset + 2, 1, false);
    view.setUint16(recordOffset + 4, 0x0409, false);
    view.setUint16(recordOffset + 6, name.id, false);
    view.setUint16(recordOffset + 8, stringPart.data.length, false);
    view.setUint16(recordOffset + 10, stringPart.offset, false);
    recordOffset += recordSize;

    view.setUint16(recordOffset, 1, false);
    view.setUint16(recordOffset + 2, 0, false);
    view.setUint16(recordOffset + 4, 0, false);
    view.setUint16(recordOffset + 6, name.id, false);
    view.setUint16(recordOffset + 8, stringPart.data.length, false);
    view.setUint16(recordOffset + 10, stringPart.offset, false);
    recordOffset += recordSize;
  }

  for (const part of stringParts) {
    data.set(part.data, stringOffset + part.offset);
  }

  return data;
}

/**
 * Build a minimal post table.
 *
 * @see https://docs.microsoft.com/en-us/typography/opentype/spec/post
 */
export function buildPostTable(): Uint8Array {
  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);

  view.setUint32(0, 0x00030000, false); // version 3.0
  view.setUint32(4, 0, false); // italicAngle
  view.setInt16(8, -100, false); // underlinePosition
  view.setInt16(10, 50, false); // underlineThickness
  view.setUint32(12, 0, false); // isFixedPitch
  view.setUint32(16, 0, false);
  view.setUint32(20, 0, false);
  view.setUint32(24, 0, false);
  view.setUint32(28, 0, false);

  return new Uint8Array(buffer);
}
