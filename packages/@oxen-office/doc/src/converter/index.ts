/**
 * @file Converts DocDocument domain model → DocxDocument for export
 */

import type {
  DocxDocument,
  DocxBody,
  DocxBlockContent,
  DocxParagraph,
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxNumberingProperties,
  DocxRun,
  DocxRunProperties,
  DocxRunFonts,
  DocxText,
  DocxSectionProperties,
  DocxPageSize,
  DocxPageMargins,
  DocxColumns,
  DocxTable,
  DocxTableRow,
  DocxTableCell,
  DocxTableCellProperties,
  DocxTableRowProperties,
  DocxOutlineLevel,
  DocxHighlightColor,
} from "@oxen-office/docx";
import type { ParagraphAlignment } from "@oxen-office/ooxml/domain/text";
import type { UnderlineStyle } from "@oxen-office/ooxml/domain/text";
import type { SectionBreakType } from "@oxen-office/docx";
import { halfPoints, twips, docxNumId, docxIlvl } from "@oxen-office/docx";
import type {
  DocDocument,
  DocParagraph,
  DocTextRun,
  DocSection,
  DocTable,
  DocTableRow,
  DocTableCell,
  DocUnderlineStyle,
  DocSectionBreakType,
  DocAlignment,
} from "../domain/types";

// --- Alignment ---

function convertAlignment(align: DocAlignment | undefined): ParagraphAlignment | undefined {
  if (!align) return undefined;
  if (align === "justify") return "both";
  if (align === "distribute") return "distribute";
  return align;
}

// --- Underline ---

const UNDERLINE_MAP: Record<DocUnderlineStyle, UnderlineStyle> = {
  single: "single",
  wordsOnly: "words",
  double: "double",
  dotted: "dotted",
  thick: "thick",
  dash: "dash",
  dotDash: "dotDash",
  dotDotDash: "dotDotDash",
  wave: "wave",
};

// --- Section break type ---

const SECTION_BREAK_MAP: Record<DocSectionBreakType, SectionBreakType> = {
  continuous: "continuous",
  newColumn: "nextColumn",
  newPage: "nextPage",
  evenPage: "evenPage",
  oddPage: "oddPage",
};

// --- Highlight color ---

// DOC ico → DOCX highlight color name
const HIGHLIGHT_COLOR_MAP: Record<string, DocxHighlightColor> = {
  "000000": "black",
  "0000FF": "blue",
  "00FFFF": "cyan",
  "00FF00": "green",
  "FF00FF": "magenta",
  "FF0000": "red",
  "FFFF00": "yellow",
  "FFFFFF": "white",
  "000080": "darkBlue",
  "008080": "darkCyan",
  "008000": "darkGreen",
  "800080": "darkMagenta",
  "800000": "darkRed",
  "808000": "darkYellow",
  "808080": "darkGray",
  "C0C0C0": "lightGray",
};

function convertHighlight(color: string | undefined): DocxHighlightColor | undefined {
  if (!color) return undefined;
  return HIGHLIGHT_COLOR_MAP[color.toUpperCase()];
}

// --- Run properties ---

function convertRunProperties(run: DocTextRun): DocxRunProperties | undefined {
  const rFonts: DocxRunFonts = {
    ...(run.fontName ? { ascii: run.fontName, hAnsi: run.fontName } : {}),
    ...(run.fontNameEastAsia ? { eastAsia: run.fontNameEastAsia } : {}),
    ...(run.fontNameComplex || run.fontNameBiDi ? { cs: run.fontNameComplex ?? run.fontNameBiDi } : {}),
  };
  const hasRFonts = Object.keys(rFonts).length > 0;

  const underlineStyle = run.underlineStyle ? UNDERLINE_MAP[run.underlineStyle] : run.underline ? "single" : undefined;
  const highlight = convertHighlight(run.highlight);

  const props: DocxRunProperties = {
    ...(run.bold ? { b: true, bCs: true } : {}),
    ...(run.italic ? { i: true, iCs: true } : {}),
    ...(underlineStyle ? { u: { val: underlineStyle, ...(run.underlineColor ? { color: run.underlineColor } : {}) } } : {}),
    ...(run.strike ? { strike: true } : {}),
    ...(run.dstrike ? { dstrike: true } : {}),
    ...(run.caps ? { caps: true } : {}),
    ...(run.smallCaps ? { smallCaps: true } : {}),
    ...(run.hidden ? { vanish: true } : {}),
    ...(run.outline ? { outline: true } : {}),
    ...(run.shadow ? { shadow: true } : {}),
    ...(run.emboss ? { emboss: true } : {}),
    ...(run.imprint ? { imprint: true } : {}),
    ...(run.superscript ? { vertAlign: "superscript" as const } : {}),
    ...(run.subscript ? { vertAlign: "subscript" as const } : {}),
    ...(run.fontSize ? { sz: halfPoints(run.fontSize * 2), szCs: halfPoints(run.fontSize * 2) } : {}),
    ...(hasRFonts ? { rFonts } : {}),
    ...(run.color ? { color: { val: run.color } } : {}),
    ...(highlight ? { highlight } : {}),
    ...(run.spacing ? { spacing: twips(run.spacing) } : {}),
  };

  return Object.keys(props).length > 0 ? props : undefined;
}

// --- Run ---

function convertRun(run: DocTextRun): DocxRun {
  const textContent: DocxText = { type: "text", value: run.text, space: "preserve" };
  const properties = convertRunProperties(run);
  return {
    type: "run",
    ...(properties ? { properties } : {}),
    content: [textContent],
  };
}

// --- Paragraph properties ---

function convertParagraphProperties(para: DocParagraph): DocxParagraphProperties | undefined {
  const jc = convertAlignment(para.alignment);

  // Indentation
  const hasIndent = para.indentLeft !== undefined || para.indentRight !== undefined || para.firstLineIndent !== undefined;
  const ind: DocxParagraphIndent | undefined = hasIndent
    ? {
        ...(para.indentLeft !== undefined ? { left: twips(para.indentLeft) } : {}),
        ...(para.indentRight !== undefined ? { right: twips(para.indentRight) } : {}),
        ...(para.firstLineIndent !== undefined
          ? para.firstLineIndent >= 0
            ? { firstLine: twips(para.firstLineIndent) }
            : { hanging: twips(-para.firstLineIndent) }
          : {}),
      }
    : undefined;

  // Spacing
  const hasSpacing =
    para.spaceBefore !== undefined || para.spaceAfter !== undefined || para.lineSpacing !== undefined;
  const spacing: DocxParagraphSpacing | undefined = hasSpacing
    ? {
        ...(para.spaceBefore !== undefined ? { before: twips(para.spaceBefore) } : {}),
        ...(para.spaceAfter !== undefined ? { after: twips(para.spaceAfter) } : {}),
        ...(para.lineSpacing
          ? para.lineSpacing.multi
            ? { line: para.lineSpacing.value, lineRule: "auto" as const }
            : { line: para.lineSpacing.value, lineRule: "exact" as const }
          : {}),
      }
    : undefined;

  // Numbering
  const hasNumPr = para.listIndex !== undefined;
  const numPr: DocxNumberingProperties | undefined = hasNumPr
    ? {
        numId: docxNumId(para.listIndex!),
        ...(para.listLevel !== undefined ? { ilvl: docxIlvl(para.listLevel) } : {}),
      }
    : undefined;

  // Outline level
  const OUTLINE_LEVELS: readonly DocxOutlineLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const outlineLvl: DocxOutlineLevel | undefined =
    para.outlineLevel !== undefined && para.outlineLevel >= 0 && para.outlineLevel <= 9
      ? OUTLINE_LEVELS[para.outlineLevel]
      : undefined;

  const props: DocxParagraphProperties = {
    ...(jc ? { jc } : {}),
    ...(ind ? { ind } : {}),
    ...(spacing ? { spacing } : {}),
    ...(numPr ? { numPr } : {}),
    ...(para.keepTogether ? { keepLines: true } : {}),
    ...(para.keepWithNext ? { keepNext: true } : {}),
    ...(para.pageBreakBefore ? { pageBreakBefore: true } : {}),
    ...(para.widowControl !== undefined ? { widowControl: para.widowControl } : {}),
    ...(outlineLvl !== undefined ? { outlineLvl } : {}),
  };

  return Object.keys(props).length > 0 ? props : undefined;
}

// --- Paragraph ---

function convertParagraph(para: DocParagraph): DocxParagraph {
  const properties = convertParagraphProperties(para);
  return {
    type: "paragraph",
    ...(properties ? { properties } : {}),
    content: para.runs.map(convertRun),
  };
}

// --- Table ---

function convertTableCell(cell: DocTableCell): DocxTableCell {
  const hasCellProps = cell.width !== undefined || cell.verticalMerge !== undefined || cell.verticalAlign !== undefined;
  const properties: DocxTableCellProperties | undefined = hasCellProps
    ? {
        ...(cell.width !== undefined ? { tcW: { value: cell.width, type: "dxa" as const } } : {}),
        ...(cell.verticalMerge ? { vMerge: cell.verticalMerge } : {}),
        ...(cell.verticalAlign ? { vAlign: cell.verticalAlign } : {}),
      }
    : undefined;

  return {
    type: "tableCell",
    ...(properties ? { properties } : {}),
    content: cell.paragraphs.map(convertParagraph),
  };
}

function convertTableRow(row: DocTableRow): DocxTableRow {
  const hasRowProps = row.height !== undefined || row.header;
  const properties: DocxTableRowProperties | undefined = hasRowProps
    ? {
        ...(row.height !== undefined ? { trHeight: { val: twips(row.height), hRule: "atLeast" as const } } : {}),
        ...(row.header ? { tblHeader: true } : {}),
      }
    : undefined;

  return {
    type: "tableRow",
    ...(properties ? { properties } : {}),
    cells: row.cells.map(convertTableCell),
  };
}

function convertTable(table: DocTable): DocxTable {
  return {
    type: "table",
    rows: table.rows.map(convertTableRow),
  };
}

// --- Section properties ---

function convertSectionProperties(section: DocSection): DocxSectionProperties {
  const hasPgSz = section.pageWidth !== undefined || section.pageHeight !== undefined || section.orientation !== undefined;
  const pgSz: DocxPageSize | undefined = hasPgSz
    ? {
        w: twips(section.pageWidth ?? 12240),
        h: twips(section.pageHeight ?? 15840),
        ...(section.orientation ? { orient: section.orientation } : {}),
      }
    : undefined;

  const hasPgMar =
    section.marginTop !== undefined ||
    section.marginBottom !== undefined ||
    section.marginLeft !== undefined ||
    section.marginRight !== undefined;
  const pgMar: DocxPageMargins | undefined = hasPgMar
    ? {
        top: twips(section.marginTop ?? 1440),
        right: twips(section.marginRight ?? 1440),
        bottom: twips(section.marginBottom ?? 1440),
        left: twips(section.marginLeft ?? 1440),
        ...(section.gutter !== undefined ? { gutter: twips(section.gutter) } : {}),
        ...(section.headerDistance !== undefined ? { header: twips(section.headerDistance) } : {}),
        ...(section.footerDistance !== undefined ? { footer: twips(section.footerDistance) } : {}),
      }
    : undefined;

  const hasCols = section.columns !== undefined || section.columnSpacing !== undefined;
  const cols: DocxColumns | undefined = hasCols
    ? {
        ...(section.columns !== undefined ? { num: section.columns } : {}),
        ...(section.columnSpacing !== undefined ? { space: twips(section.columnSpacing) } : {}),
      }
    : undefined;

  const breakType = section.breakType ? SECTION_BREAK_MAP[section.breakType] : undefined;

  return {
    ...(breakType ? { type: breakType } : {}),
    ...(pgSz ? { pgSz } : {}),
    ...(pgMar ? { pgMar } : {}),
    ...(cols ? { cols } : {}),
    ...(section.titlePage ? { titlePg: true } : {}),
  };
}

// --- Document ---

function convertBlockContent(item: DocParagraph | DocTable): DocxBlockContent {
  if ("rows" in item) {
    return convertTable(item);
  }
  return convertParagraph(item);
}

/** Convert a DocDocument to a DocxDocument suitable for export. */
export function convertDocToDocx(doc: DocDocument): DocxDocument {
  // Use content (mixed paragraphs + tables) if available, otherwise fall back to paragraphs
  const source: readonly (DocParagraph | DocTable)[] = doc.content ?? doc.paragraphs;
  const content: DocxBlockContent[] = source.map(convertBlockContent);

  // Attach section properties to last paragraph of each section
  if (doc.sections && doc.sections.length > 0) {
    const lastSection = doc.sections[doc.sections.length - 1];
    const sectPr = convertSectionProperties(lastSection);

    // Attach to the last paragraph in content
    if (content.length > 0) {
      const lastPara = content[content.length - 1];
      if (lastPara.type === "paragraph") {
        const paraProps = lastPara.properties ?? {};
        content[content.length - 1] = {
          ...lastPara,
          properties: { ...paraProps, sectPr },
        };
      }
    }
  }

  const body: DocxBody = { content };

  return { body };
}
