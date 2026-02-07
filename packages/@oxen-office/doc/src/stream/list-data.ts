/**
 * @file List definition (PlfLst / PlfLfo) parser
 *
 * Reference: [MS-DOC] 2.9.160 (PlfLst), 2.9.133 (LSTF), 2.9.131 (LVL)
 *
 * PlfLst: cLst(2B) + LSTF[cLst] + LVL[] (variable, after all LSTFs)
 * LSTF: 28 bytes each (lsid, tplc, rgistdPara[9], flags, grfhic)
 * LVL: LVLF(28B) + grpprlPapx(cbGrpprlPapx bytes) + grpprlChpx(cbGrpprlChpx bytes) + xst
 */

import type { DocListDefinition, DocListLevel, DocListOverride } from "../domain/types";

/** Parse PlfLst from the table stream. */
export function parseListDefinitions(tableStream: Uint8Array, fc: number, lcb: number): readonly DocListDefinition[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cLst = view.getInt16(fc, true);
  if (cLst <= 0) return [];

  // Parse LSTF entries (28 bytes each)
  const lstfs: Array<{ lsid: number; simpleList: boolean; levelCount: number }> = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 2;

  for (let i = 0; i < cLst; i++) {
    if (offset + 28 > fc + lcb) break;

    const lsid = view.getInt32(offset, true);
    const flags = tableStream[offset + 26];
    const simpleList = (flags & 0x01) !== 0;
    const levelCount = simpleList ? 1 : 9;

    lstfs.push({ lsid, simpleList, levelCount });
    offset += 28;
  }

  // Parse LVL entries (variable length, after all LSTFs)
  const definitions: DocListDefinition[] = [];
  for (const lstf of lstfs) {
    const levels: DocListLevel[] = [];
    for (let lvl = 0; lvl < lstf.levelCount; lvl++) {
      if (offset + 28 > fc + lcb) break;

      const level = parseLvl(tableStream, offset, fc + lcb);
      if (!level) break;

      levels.push(level.level);
      offset = level.nextOffset;
    }

    definitions.push({
      lsid: lstf.lsid,
      levels,
      simpleList: lstf.simpleList,
    });
  }

  return definitions;
}

function parseLvl(
  data: Uint8Array,
  offset: number,
  end: number,
): { level: DocListLevel; nextOffset: number } | undefined {
  if (offset + 28 > end) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // LVLF (28 bytes)
  const iStartAt = view.getInt32(offset, true);
  const nfc = data[offset + 4];
  const jcFlags = data[offset + 5];
  const jc = jcFlags & 0x03;
  const ixchFollow = data[offset + 17];
  const cbGrpprlChpx = data[offset + 26];
  const cbGrpprlPapx = data[offset + 27];

  // Skip LVLF + grpprlPapx + grpprlChpx
  // eslint-disable-next-line no-restricted-syntax -- offset calc
  let pos = offset + 28 + cbGrpprlPapx + cbGrpprlChpx;

  // xst: cch(2B) + UTF-16LE string
  let text = "";
  if (pos + 2 <= end) {
    const cch = view.getUint16(pos, true);
    pos += 2;
    if (cch > 0 && pos + cch * 2 <= end) {
      const textBytes = data.subarray(pos, pos + cch * 2);
      text = new TextDecoder("utf-16le").decode(textBytes);
      pos += cch * 2;
    }
  }

  return {
    level: {
      start: iStartAt,
      format: nfc,
      text,
      alignment: jc,
      follow: ixchFollow,
    },
    nextOffset: pos,
  };
}

/** Parse PlfLfo from the table stream. */
export function parseListOverrides(tableStream: Uint8Array, fc: number, lcb: number): readonly DocListOverride[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cLfo = view.getInt32(fc, true);
  if (cLfo <= 0) return [];

  const overrides: DocListOverride[] = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 4;

  for (let i = 0; i < cLfo; i++) {
    if (offset + 16 > fc + lcb) break;

    const lsid = view.getInt32(offset, true);
    overrides.push({ lsid });
    offset += 16; // LFO is 16 bytes
  }

  return overrides;
}
