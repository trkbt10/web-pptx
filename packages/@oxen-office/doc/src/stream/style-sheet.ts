/**
 * @file Style sheet (STSH) parser
 *
 * Reference: [MS-DOC] 2.9.271
 *
 * Structure: STSHI header + STD[] array
 * STSHI: cbStshi(2B) + header bytes
 * Each STD: cbStd(2B) + STD body
 */

import type { DocStyle, DocStyleType } from "../domain/types";

/** Parse the STSH (style sheet) from the table stream. */
export function parseStyleSheet(tableStream: Uint8Array, fc: number, lcb: number): readonly DocStyle[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);

  // STSHI header size
  const cbStshi = view.getUint16(fc, true);
  if (cbStshi < 4) return [];

  // STSHI header fields
  const cstd = view.getUint16(fc + 2, true);
  const cbSTDBaseInFile = view.getUint16(fc + 4, true);

  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 2 + cbStshi; // skip header (cbStshi includes its own content)

  const styles: DocStyle[] = [];

  for (let i = 0; i < cstd; i++) {
    if (offset + 2 > fc + lcb) break;

    const cbStd = view.getUint16(offset, true);
    offset += 2;

    if (cbStd === 0) {
      // Empty style slot
      styles.push({ index: i, type: "paragraph", name: undefined });
      continue;
    }

    if (offset + cbStd > fc + lcb) break;

    const style = parseStd(tableStream, offset, cbStd, cbSTDBaseInFile, i);
    styles.push(style);

    offset += cbStd;
  }

  return styles;
}

function sgcToType(sgc: number): DocStyleType {
  switch (sgc) {
    case 1:
      return "paragraph";
    case 2:
      return "character";
    case 3:
      return "table";
    case 4:
      return "list";
    default:
      return "paragraph";
  }
}

function parseStd(
  data: Uint8Array,
  offset: number,
  cbStd: number,
  cbSTDBaseInFile: number,
  index: number,
): DocStyle {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  if (cbStd < 4) {
    return { index, type: "paragraph" };
  }

  // STD word 0: sti(12bit) + flags(4bit)
  const word0 = view.getUint16(offset, true);
  const _sti = word0 & 0x0fff;

  // STD word 1: sgc(4bit) + istdBase(12bit)
  const word1 = view.getUint16(offset + 2, true);
  const sgc = word1 & 0x000f;
  const istdBase = (word1 >> 4) & 0x0fff;

  // STD word 2: cupx(4bit) + istdNext(12bit)
  let istdNext: number | undefined;
  if (cbStd >= 6) {
    const word2 = view.getUint16(offset + 4, true);
    istdNext = (word2 >> 4) & 0x0fff;
  }

  // Style name: after cbSTDBaseInFile bytes from the STD start
  let name: string | undefined;
  const nameOffset = offset + cbSTDBaseInFile;
  if (nameOffset + 2 <= offset + cbStd) {
    // xstzName: cch(2B) + UTF-16LE string
    const cch = view.getUint16(nameOffset, true);
    if (cch > 0 && nameOffset + 2 + cch * 2 <= offset + cbStd) {
      const nameBytes = data.subarray(nameOffset + 2, nameOffset + 2 + cch * 2);
      name = new TextDecoder("utf-16le").decode(nameBytes);
    }
  }

  return {
    index,
    type: sgcToType(sgc),
    basedOn: istdBase !== 0x0fff ? istdBase : undefined,
    next: istdNext !== undefined && istdNext !== 0x0fff ? istdNext : undefined,
    name,
  };
}
