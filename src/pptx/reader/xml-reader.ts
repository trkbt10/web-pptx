/**
 * @file XML reading utilities for PPTX files
 * Handles reading and parsing XML from PresentationFile
 */

import type { PresentationFile } from "../types/file";
import type { XmlDocument } from "../../xml";
import type { SlideResources } from "../core/opc";
import { stripCdata, parseXml, applyMarkupCompatibility, type MarkupCompatibilityOptions } from "../../xml";
import { getRelationshipPath } from "../core/opc/content-types";
import { parseRelationships } from "../core/opc/relationships";

export const DEFAULT_MARKUP_COMPATIBILITY_OPTIONS: MarkupCompatibilityOptions = {
  supportedPrefixes: [
    "a",
    "c",
    "dgm",
    "dsp",
    "mc",
    "o",
    "p",
    "r",
    "v",
    "wp",
    "wpc",
    "wpg",
    "wsp",
    "wgp",
    "xdr",
  ],
};

/**
 * Process content for CDATA removal if needed
 * Office 2007 and earlier (appVersion <= 12) may contain CDATA tags
 */
function processContent(text: string, appVersion: number, isSlideContent: boolean): string {
  if (isSlideContent && appVersion <= 12) {
    return stripCdata(text);
  }
  return text;
}

/**
 * Read and parse XML from PresentationFile
 *
 * @param file - The presentation file to read from
 * @param path - Path to the XML file within the archive
 * @param appVersion - PowerPoint version (default: 16 for modern)
 * @param isSlideContent - Whether this is slide content (for CDATA handling)
 * @returns Parsed XML document or null if file doesn't exist
 * @throws Error if XML parsing fails (with path context for debugging)
 */
export function readXml(
  file: PresentationFile,
  path: string,
  appVersion: number = 16,
  isSlideContent: boolean = false,
  markupCompatibility: MarkupCompatibilityOptions,
): XmlDocument | null {
  if (!markupCompatibility) {
    throw new Error("Markup compatibility options are required.");
  }

  const text = file.readText(path);
  if (text === null) {
    return null;
  }

  const content = processContent(text, appVersion, isSlideContent);
  const document = parseXml(content);
  return applyMarkupCompatibility(document, markupCompatibility);
}

/**
 * Get relationships for a file by reading its .rels file
 * @param file - The presentation file to read from
 * @param path - Path to the file whose relationships to get
 * @returns Parsed relationships or empty object if not found
 */
export function getRelationships(
  file: PresentationFile,
  path: string,
  markupCompatibility: MarkupCompatibilityOptions,
): SlideResources {
  const relsPath = getRelationshipPath(path);
  const relsXml = readXml(file, relsPath, 16, false, markupCompatibility);
  if (relsXml === null) {
    return {};
  }
  return parseRelationships(relsXml);
}
