/**
 * @file Text editing module
 *
 * Provides utilities for inline text editing in the slide editor.
 * Handles TextBody ↔ HTML conversion with proper style resolution.
 */

// State types and constructors
export {
  type TextEditBounds,
  type InactiveTextEditState,
  type ActiveTextEditState,
  type TextEditState,
  createInactiveTextEditState,
  createActiveTextEditState,
  isTextEditInactive,
  isTextEditActive,
} from "./state";

// Style conversion
export {
  type StyleResolutionContext,
  runPropertiesToStyle,
  runPropertiesToStyleObject,
} from "./styles";

// TextBody ↔ HTML conversion
export {
  type TextToHtmlOptions,
  textBodyToHtml,
  textBodyToPlainText,
} from "./text-to-html";

export {
  type HtmlToTextOptions,
  htmlToTextBody,
  plainTextToTextBody,
  mergeTextIntoBody,
} from "./html-to-text";
