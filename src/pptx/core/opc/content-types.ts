/**
 * @file Content types parsing utilities
 */

import type { ContentTypes } from "../../types";
import type { XmlDocument } from "../../../xml/index";
import type { SlideFileInfo } from "./types";
import { getBasename, getByPath, getChildren } from "../../../xml/index";

/**
 * Content type constants for PPTX files
 */
export const CONTENT_TYPES = {
  SLIDE: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  SLIDE_LAYOUT: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  SLIDE_MASTER: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  THEME: "application/vnd.openxmlformats-officedocument.theme+xml",
  NOTES: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  PRESENTATION: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
} as const;

/**
 * Relationship type constants
 */
export const RELATIONSHIP_TYPES = {
  SLIDE_LAYOUT: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
  SLIDE_MASTER: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
  THEME: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  THEME_OVERRIDE: "http://purl.oclc.org/ooxml/officeDocument/relationships/themeOverride",
  IMAGE: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  CHART: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  HYPERLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  NOTES: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  DIAGRAM_DRAWING: "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing",
  VML_DRAWING: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
  OLE_OBJECT: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
} as const;

/**
 * Parse content types from [Content_Types].xml
 * @param contentTypesXml - Parsed content types XML
 * @returns Content types object with slide and layout arrays
 */
export function parseContentTypes(contentTypesXml: XmlDocument): ContentTypes {
  const slidesLocArray: string[] = [];
  const slideLayoutsLocArray: string[] = [];

  // Get Types element from document
  const typesElement = getByPath(contentTypesXml, ["Types"]);
  if (!typesElement) {
    return { slides: slidesLocArray, slideLayouts: slideLayoutsLocArray };
  }

  // Get all Override elements
  const overrideArray = getChildren(typesElement, "Override");

  for (const override of overrideArray) {
    const contentType = override.attrs["ContentType"];
    const partName = override.attrs["PartName"];

    if (contentType === undefined || partName === undefined) {
      continue;
    }

    switch (contentType) {
      case CONTENT_TYPES.SLIDE:
        // Remove leading slash
        slidesLocArray.push(partName.startsWith("/") ? partName.substring(1) : partName);
        break;
      case CONTENT_TYPES.SLIDE_LAYOUT:
        slideLayoutsLocArray.push(partName.startsWith("/") ? partName.substring(1) : partName);
        break;
    }
  }

  // Sort slides by number
  slidesLocArray.sort((a, b) => {
    const numA = extractSlideNumber(a);
    const numB = extractSlideNumber(b);
    return numA - numB;
  });

  return {
    slides: slidesLocArray,
    slideLayouts: slideLayoutsLocArray,
  };
}

/**
 * Extract slide number from filename
 * @param filename - Slide filename (e.g., "ppt/slides/slide3.xml")
 * @returns Slide number
 */
export function extractSlideNumber(filename: string): number {
  const match = filename.match(/slide(\d+)\.xml$/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get relationship file path from slide path
 * @param slidePath - Slide file path (e.g., "ppt/slides/slide1.xml")
 * @returns Relationship file path (e.g., "ppt/slides/_rels/slide1.xml.rels")
 */
export function getRelationshipPath(slidePath: string): string {
  const parts = slidePath.split("/");
  const filename = parts.pop() ?? "";
  return [...parts, "_rels", `${filename}.rels`].join("/");
}

/**
 * Build SlideFileInfo array from content type slide paths
 * @param slidePaths - Array of slide paths from content types
 * @returns Array of SlideFileInfo with path, number, and filename
 */
export function buildSlideFileInfoList(slidePaths: readonly string[]): SlideFileInfo[] {
  return slidePaths.map((path) => {
    const number = extractSlideNumber(path);
    const basename = getBasename(path);
    const filename = basename !== "" ? basename : `slide${number}`;
    return { path, number, filename };
  });
}
