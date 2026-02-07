/**
 * @file @oxen-office/doc public API
 */

export { parseDoc, parseDocWithReport, type ParseDocOptions, type ParseDocResult } from "./parser";
export { convertDocToDocx } from "./converter";
export { extractDocDocument } from "./extractor";
export type {
  DocDocument,
  DocParagraph,
  DocTextRun,
  DocUnderlineStyle,
  DocLineSpacing,
  DocAlignment,
  DocSection,
  DocSectionBreakType,
  DocTable,
  DocTableRow,
  DocTableCell,
  DocStyle,
  DocStyleType,
  DocListDefinition,
  DocListLevel,
  DocListOverride,
  DocHyperlink,
  DocHeaderFooter,
  DocHeaderFooterType,
  DocNote,
  DocComment,
  DocBookmark,
  DocField,
  DocBlockContent,
} from "./domain/types";
