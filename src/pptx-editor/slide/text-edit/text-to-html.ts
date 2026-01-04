/**
 * @file TextBody to HTML conversion
 *
 * Converts PPTX TextBody to editable HTML for contentEditable elements.
 * Properly resolves scheme colors using ColorContext.
 */

import type { TextBody, Paragraph, TextRun } from "../../../pptx/domain";
import { runPropertiesToStyle, type StyleResolutionContext } from "./styles";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for HTML conversion
 */
export type TextToHtmlOptions = {
  /** Whether to include styling */
  readonly includeStyles?: boolean;
  /** Style resolution context for color/font resolution */
  readonly styleContext?: StyleResolutionContext;
};

// =============================================================================
// Run Conversion
// =============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function runToHtml(run: TextRun, options: TextToHtmlOptions): string {
  switch (run.type) {
    case "text": {
      const escapedText = escapeHtml(run.text);
      if (!options.includeStyles || !run.properties) {
        return `<span>${escapedText}</span>`;
      }
      const style = runPropertiesToStyle(run.properties, options.styleContext);
      const styleAttr = style ? ` style="${style}"` : "";
      return `<span${styleAttr}>${escapedText}</span>`;
    }
    case "break":
      return "<br/>";
    case "field":
      return `<span data-field-type="${run.fieldType ?? "unknown"}">${escapeHtml(run.text ?? "")}</span>`;
  }
}

// =============================================================================
// Paragraph Conversion
// =============================================================================

function paragraphToHtml(paragraph: Paragraph, options: TextToHtmlOptions): string {
  const runs = paragraph.runs.map((run) => runToHtml(run, options)).join("");
  return `<div class="paragraph">${runs || "<br/>"}</div>`;
}

// =============================================================================
// TextBody Conversion
// =============================================================================

/**
 * Convert TextBody to HTML string.
 * Pass styleContext for proper scheme color resolution.
 */
export function textBodyToHtml(
  textBody: TextBody,
  options: TextToHtmlOptions = {},
): string {
  const opts: TextToHtmlOptions = {
    includeStyles: true,
    ...options,
  };

  return textBody.paragraphs.map((p) => paragraphToHtml(p, opts)).join("");
}

/**
 * Get plain text from TextBody
 */
export function textBodyToPlainText(textBody: TextBody): string {
  return textBody.paragraphs
    .map((p) =>
      p.runs
        .map((run) => {
          switch (run.type) {
            case "text":
              return run.text;
            case "break":
              return "\n";
            case "field":
              return run.text ?? "";
          }
        })
        .join(""),
    )
    .join("\n");
}
