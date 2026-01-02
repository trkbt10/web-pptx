/**
 * @file ECMA-376 default values and constants
 *
 * Default values specified in ECMA-376 Office Open XML specification.
 *
 * @see ECMA-376 Part 1
 */

export {
  // Font defaults
  DEFAULT_FONT_SIZE_PT,
  DEFAULT_FONT_SIZE_CENTIPOINTS,
  FONT_SIZE_CENTIPOINTS_TO_PT,

  // Paragraph defaults
  DEFAULT_LINE_SPACING_PCT,
  DEFAULT_PARAGRAPH_SPACING_PT,

  // Margin defaults
  DEFAULT_TEXT_MARGIN_EMU,
  DEFAULT_MARGIN_LEFT_EMU,
  DEFAULT_INDENT_EMU,

  // Unit constants
  EMU_PER_INCH,
  STANDARD_DPI,
  EMU_PER_PIXEL,
  POINTS_PER_INCH,
  OOXML_PERCENT_FACTOR,

  // Presentation defaults
  DEFAULT_SERVER_ZOOM,
  DEFAULT_FIRST_SLIDE_NUM,
  DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD,
  DEFAULT_RTL,
  DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE,
  DEFAULT_COMPAT_MODE,
  DEFAULT_STRICT_FIRST_AND_LAST_CHARS,
  DEFAULT_EMBED_TRUETYPE_FONTS,
  DEFAULT_SAVE_SUBSET_FONTS,
  DEFAULT_AUTO_COMPRESS_PICTURES,
  DEFAULT_BOOKMARK_ID_SEED,
} from "./defaults";

// Placeholder type to text style mappings
export type { MasterTextStyleName } from "./placeholder-styles";
export {
  PLACEHOLDER_TO_TEXT_STYLE,
  TITLE_TYPES,
  isTitleType,
  getTextStyleName,
} from "./placeholder-styles";

// Language constants
export { RTL_LANGUAGES } from "./language";
