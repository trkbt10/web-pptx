/**
 * @file Text extraction from domain shapes
 */

import type { TextBody, TextRun, Paragraph } from "@oxen-office/pptx/domain/text";
import type { Shape } from "@oxen-office/pptx/domain/shape";

/**
 * Extract plain text from a TextBody
 */
export function extractTextFromBody(textBody: TextBody): string {
  return textBody.paragraphs.map(extractTextFromParagraph).join("\n");
}

/**
 * Extract plain text from a Paragraph
 */
export function extractTextFromParagraph(paragraph: Paragraph): string {
  return paragraph.runs.map(extractTextFromRun).join("");
}

/**
 * Extract plain text from a TextRun
 */
export function extractTextFromRun(run: TextRun): string {
  switch (run.type) {
    case "text":
      return run.text;
    case "break":
      return "\n";
    case "field":
      return run.text;
  }
}

/**
 * Extract plain text from a Shape (if it has text)
 */
export function extractTextFromShape(shape: Shape): string {
  if (shape.type === "sp" && shape.textBody) {
    return extractTextFromBody(shape.textBody);
  }
  if (shape.type === "grpSp") {
    return shape.children.map(extractTextFromShape).filter(Boolean).join("\n");
  }
  return "";
}
