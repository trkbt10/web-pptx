/**
 * @file Table property (TAP) extractor
 *
 * Extracts table row/cell properties from TAP SPRMs in row-end (TTP) paragraph PAPX.
 *
 * TAP SPRMs are embedded in the same grpprl as PAP SPRMs but have sgc=5 (table).
 * They define column widths, row height, header rows, cell merge/align, etc.
 */

import type { Sprm } from "../sprm/sprm-decoder";
import { SPRM_TAP, sprmUint8, sprmUint16, sprmInt16 } from "../sprm/sprm-decoder";

/** Extracted table row/cell properties from TAP SPRMs. */
export type TapProps = {
  readonly rowHeight?: number;
  readonly isHeader?: boolean;
  readonly cellWidths?: readonly number[];
  readonly verticalMerge?: ReadonlyArray<"restart" | "continue" | undefined>;
  readonly verticalAlign?: ReadonlyArray<"top" | "center" | "bottom" | undefined>;
  readonly alignment?: "left" | "center" | "right";
};

function parseTDefTable(sprm: Sprm): readonly number[] | undefined {
  // sprmTDefTable (0xD608) operand:
  //   cb(2B) — total byte count (already consumed by SPRM decoder for variable-length)
  //   itcMac(1B) — number of cells
  //   rgdxaCenter[itcMac+1] — int16 array of cell boundary x-positions
  //   rgtc[itcMac] — TC structure array (20B each, cell properties)
  const data = sprm.operand;
  if (data.length < 3) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // For variable-length SPRMs (spra=6), the operand includes the size prefix
  // Check if first 2 bytes are the cb size
  const cb = view.getUint16(0, true);
  const itcMac = data[2];

  if (itcMac === 0 || itcMac > 64) return undefined;

  // rgdxaCenter: (itcMac + 1) × int16 values
  const cellWidths: number[] = [];
  const centerOffset = 3;

  if (centerOffset + (itcMac + 1) * 2 > data.length) return undefined;

  const centers: number[] = [];
  for (let i = 0; i <= itcMac; i++) {
    centers.push(view.getInt16(centerOffset + i * 2, true));
  }

  // Cell widths = difference between consecutive centers
  for (let i = 0; i < itcMac; i++) {
    cellWidths.push(centers[i + 1] - centers[i]);
  }

  return cellWidths;
}

function tapJcToAlignment(jc: number): "left" | "center" | "right" | undefined {
  switch (jc) {
    case 0:
      return "left";
    case 1:
      return "center";
    case 2:
      return "right";
    default:
      return undefined;
  }
}

/** Extract table properties from SPRMs (TAP SPRMs in a row-end PAPX grpprl). */
export function extractTapProps(sprms: readonly Sprm[]): TapProps {
  let rowHeight: number | undefined;
  let isHeader: boolean | undefined;
  let cellWidths: readonly number[] | undefined;
  let alignment: "left" | "center" | "right" | undefined;

  for (const sprm of sprms) {
    switch (sprm.opcode.raw) {
      case SPRM_TAP.TDyaRowHeight:
        rowHeight = sprmInt16(sprm);
        break;
      case SPRM_TAP.TTableHeader:
        isHeader = sprmUint8(sprm) !== 0;
        break;
      case SPRM_TAP.TDefTable:
        cellWidths = parseTDefTable(sprm);
        break;
      case SPRM_TAP.TJc:
        alignment = tapJcToAlignment(sprmUint16(sprm));
        break;
    }
  }

  return {
    ...(rowHeight !== undefined ? { rowHeight } : {}),
    ...(isHeader !== undefined ? { isHeader } : {}),
    ...(cellWidths !== undefined ? { cellWidths } : {}),
    ...(alignment !== undefined ? { alignment } : {}),
  };
}
