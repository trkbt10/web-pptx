/**
 * @file DOCX Domain Types Index
 *
 * Re-exports all DOCX domain types for convenient access.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

// Types
export type {
  DocxStyleId,
  DocxAbstractNumId,
  DocxNumId,
  DocxIlvl,
  BookmarkId,
  CommentId,
  NoteId,
  DocxRelId,
  Twips,
  HalfPoints,
  SignedTwips,
  DocxRowIndex,
  DocxCellIndex,
  HeaderFooterType,
  SectionBreakType,
} from "./types";

export {
  docxStyleId,
  docxAbstractNumId,
  docxNumId,
  docxIlvl,
  bookmarkId,
  commentId,
  noteId,
  docxRelId,
  twips,
  halfPoints,
  signedTwips,
  docxRowIndex,
  docxCellIndex,
  twipsToPixels,
  twipsToPoints,
  halfPointsToPoints,
} from "./types";

// Run types
export type {
  DocxRunFonts,
  DocxThemeFont,
  DocxColor,
  DocxThemeColor,
  DocxShading,
  DocxShadingPattern,
  DocxRunBorder,
  DocxUnderline,
  DocxHighlightColor,
  DocxVerticalAlignRun,
  DocxRunProperties,
  DocxEastAsianLayout,
  DocxText,
  DocxTab,
  DocxBreak,
  DocxSymbol,
  DocxRunContent,
  DocxRun,
} from "./run";

// Paragraph types
export type {
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorderEdge,
  DocxParagraphBorders,
  DocxTabStop,
  DocxTabStops,
  DocxNumberingProperties,
  DocxFrameProperties,
  DocxOutlineLevel,
  DocxParagraphProperties,
  DocxSectionPropertiesRef,
  DocxParagraphPropertiesChange,
  DocxHyperlink,
  DocxBookmarkStart,
  DocxBookmarkEnd,
  DocxCommentRangeStart,
  DocxCommentRangeEnd,
  DocxParagraphContent,
  DocxParagraph,
} from "./paragraph";

// Table types
export type {
  DocxTableBorderEdge,
  DocxTableBorders,
  DocxCellBorders,
  DocxCellWidth,
  DocxTableCellProperties,
  DocxTableCell,
  DocxRowHeight,
  DocxTableRowProperties,
  DocxTableRow,
  DocxTablePositioning,
  DocxTableCellSpacing,
  DocxTableProperties,
  DocxTableLook,
  DocxTableGrid,
  DocxTable,
} from "./table";

// Section types
export type {
  DocxPageSize,
  DocxPageMargins,
  DocxPageBorderEdge,
  DocxPageBorders,
  DocxColumn,
  DocxColumns,
  DocxHeaderFooterRef,
  DocxLineNumbering,
  DocxPageNumberFormat,
  DocxPageNumberType,
  DocxDocGridType,
  DocxDocGrid,
  DocxVerticalJc,
  DocxFormProt,
  DocxSectionProperties,
  DocxNotePr,
} from "./section";

// Style types
export type {
  DocxStyleType,
  DocxStyleName,
  DocxStyleAliases,
  DocxStyleBasedOn,
  DocxStyleNext,
  DocxStyleLink,
  DocxStyleUiPriority,
  DocxStyle,
  DocxTableStylePr,
  DocxTableStyleType,
  DocxRunPropertiesDefault,
  DocxParagraphPropertiesDefault,
  DocxDocDefaults,
  DocxLatentStyleException,
  DocxLatentStyles,
  DocxStyles,
} from "./styles";

// Numbering types
export type {
  DocxLevelJustification,
  DocxLevelText,
  DocxLevelPicBullet,
  DocxLevel,
  DocxLegacy,
  DocxAbstractNum,
  DocxLevelOverride,
  DocxNum,
  DocxNumPicBullet,
  DocxNumbering,
} from "./numbering";

// Document types
export type {
  DocxSectionBreak,
  DocxBlockContent,
  DocxBody,
  DocxCompatSettings,
  DocxZoom,
  DocxSettings,
  DocxDocumentProtection,
  DocxThemeFontLang,
  DocxHeader,
  DocxFooter,
  DocxComment,
  DocxComments,
  DocxNoteType,
  DocxFootnote,
  DocxEndnote,
  DocxFootnotes,
  DocxEndnotes,
  DocxRelationship,
  DocxRelationships,
  DocxDocument,
} from "./document";
