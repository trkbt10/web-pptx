/**
 * @file Text Body Merge Utilities
 *
 * Functions for merging edited plain text back into TextBody structures,
 * preserving original styling and properties.
 */

import type { TextBody, RunProperties } from "../../../pptx/domain";

/**
 * Merge edited text into original TextBody, preserving styling.
 *
 * @param originalBody - Original TextBody to preserve bodyProperties from
 * @param newText - New plain text content
 * @param defaultRunProperties - Run properties to apply to all new runs (REQUIRED)
 */
export function mergeTextIntoBody(
  originalBody: TextBody,
  newText: string,
  defaultRunProperties: RunProperties,
): TextBody {
  const lines = newText.split("\n");

  // Create new paragraphs, preserving original paragraph properties where possible
  const paragraphs: TextBody["paragraphs"] = lines.map((line, index) => {
    const originalParagraph = originalBody.paragraphs[index];
    return {
      properties: originalParagraph?.properties ?? {},
      runs: [{
        type: "text" as const,
        text: line,
        properties: defaultRunProperties,
      }],
    };
  });

  const defaultParagraph: TextBody["paragraphs"][number] = {
    properties: {},
    runs: [{
      type: "text",
      text: "",
      properties: defaultRunProperties,
    }],
  };

  return {
    bodyProperties: originalBody.bodyProperties,
    paragraphs: paragraphs.length > 0 ? paragraphs : [defaultParagraph],
  };
}

/**
 * Extract default RunProperties from a TextBody.
 * Uses the first run's properties, or empty object if none found.
 */
export function extractDefaultRunProperties(textBody: TextBody): RunProperties {
  const firstPara = textBody.paragraphs[0];
  if (!firstPara) {
    return {};
  }
  const firstRun = firstPara.runs[0];
  if (!firstRun || firstRun.type !== "text") {
    return {};
  }
  return firstRun.properties ?? {};
}
