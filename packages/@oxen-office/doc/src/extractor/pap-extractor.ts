/**
 * @file Paragraph property extractor
 *
 * Pipeline: CP → FC (via piece table) → BinTable → FKP page → PAPX → SPRM → DocParagraph properties
 */

import type { DocAlignment, DocLineSpacing } from "../domain/types";
import type { Sprm } from "../sprm/sprm-decoder";
import {
  SPRM_PAP,
  sprmUint8,
  sprmInt16,
  sprmUint16,
  sprmInt32,
} from "../sprm/sprm-decoder";
import type { BinTable } from "../stream/bin-table";
import { findFkpPage } from "../stream/bin-table";
import { parsePapFkp, type PapxRun } from "../stream/fkp";

/** Mutable paragraph properties accumulated from SPRMs. */
export type PapProps = {
  alignment?: DocAlignment;
  indentLeft?: number;
  indentRight?: number;
  firstLineIndent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  lineSpacing?: DocLineSpacing;
  keepTogether?: boolean;
  keepWithNext?: boolean;
  pageBreakBefore?: boolean;
  widowControl?: boolean;
  outlineLevel?: number;
  listIndex?: number;
  listLevel?: number;
  inTable?: boolean;
  isRowEnd?: boolean;
  tableDepth?: number;
  istd?: number;
};

function jcToAlignment(jc: number): DocAlignment | undefined {
  switch (jc) {
    case 0:
      return "left";
    case 1:
      return "center";
    case 2:
      return "right";
    case 3:
      return "justify";
    case 4:
      return "distribute";
    default:
      return undefined;
  }
}

function applyPapSprm(props: PapProps, sprm: Sprm): void {
  switch (sprm.opcode.raw) {
    case SPRM_PAP.PJc:
    case SPRM_PAP.PJc80:
      props.alignment = jcToAlignment(sprmUint8(sprm));
      break;
    case SPRM_PAP.PFKeep:
      props.keepTogether = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFKeepFollow:
      props.keepWithNext = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFPageBreakBefore:
      props.pageBreakBefore = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFInTable:
      props.inTable = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFTtp:
      props.isRowEnd = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PFWidowControl:
      props.widowControl = sprmUint8(sprm) !== 0;
      break;
    case SPRM_PAP.PIlvl:
      props.listLevel = sprmUint8(sprm);
      break;
    case SPRM_PAP.POutLvl: {
      const lvl = sprmUint8(sprm);
      props.outlineLevel = lvl <= 8 ? lvl : undefined; // 9 = body text
      break;
    }
    case SPRM_PAP.PIlfo:
      props.listIndex = sprmUint16(sprm);
      break;
    case SPRM_PAP.PDxaLeft:
    case SPRM_PAP.PDxaLeft80:
      props.indentLeft = sprmInt16(sprm);
      break;
    case SPRM_PAP.PDxaRight:
    case SPRM_PAP.PDxaRight80:
      props.indentRight = sprmInt16(sprm);
      break;
    case SPRM_PAP.PDxaLeft1:
    case SPRM_PAP.PDxaLeft180:
      props.firstLineIndent = sprmInt16(sprm);
      break;
    case SPRM_PAP.PDyaBefore:
      props.spaceBefore = sprmUint16(sprm);
      break;
    case SPRM_PAP.PDyaAfter:
      props.spaceAfter = sprmUint16(sprm);
      break;
    case SPRM_PAP.PDyaLine: {
      // LSPD structure: dyaLine(int16) + fMultLinespace(int16)
      if (sprm.operand.length >= 4) {
        const view = new DataView(sprm.operand.buffer, sprm.operand.byteOffset, sprm.operand.byteLength);
        const dyaLine = view.getInt16(0, true);
        const fMult = view.getInt16(2, true);
        props.lineSpacing = { value: dyaLine, multi: fMult !== 0 };
      }
      break;
    }
    case SPRM_PAP.PItap:
      props.tableDepth = sprmInt32(sprm);
      break;
  }
}

/** Apply paragraph SPRMs to build paragraph properties. */
export function extractPapProps(sprms: readonly Sprm[], istd: number): PapProps {
  const props: PapProps = { istd };
  for (const sprm of sprms) {
    applyPapSprm(props, sprm);
  }
  return props;
}

/** Cached PAP-FKP page data. */
type PapFkpCache = Map<number, readonly PapxRun[]>;

/** Find paragraph properties for a given FC. */
export function findPapxAtFc(
  fc: number,
  papBinTable: BinTable,
  wordDocStream: Uint8Array,
  cache: PapFkpCache,
): PapProps {
  const run = findRawPapxAtFc(fc, papBinTable, wordDocStream, cache);
  if (!run) return {};
  return extractPapProps(run.sprms, run.istd);
}

/** Find raw PapxRun for a given FC. Returns the full run including raw SPRMs. */
export function findRawPapxAtFc(
  fc: number,
  papBinTable: BinTable,
  wordDocStream: Uint8Array,
  cache: PapFkpCache,
): PapxRun | undefined {
  const pageNum = findFkpPage(papBinTable, fc);
  if (pageNum === undefined) return undefined;

  let runs = cache.get(pageNum);
  if (!runs) {
    try {
      runs = parsePapFkp(wordDocStream, pageNum);
    } catch {
      return undefined;
    }
    cache.set(pageNum, runs);
  }

  for (const run of runs) {
    if (fc >= run.fcStart && fc < run.fcEnd) {
      return run;
    }
  }

  return undefined;
}
