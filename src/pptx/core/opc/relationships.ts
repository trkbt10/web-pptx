/**
 * @file Relationship parsing utilities
 */

import type { SlideResources, ResourceObject } from "./types";
import type { XmlDocument } from "../../../xml/index";
import { normalizePptPath, getByPath, getChildren } from "../../../xml/index";
import { RELATIONSHIP_TYPES } from "./content-types";

/**
 * Parse relationships from .rels file
 * @param relsXml - Parsed relationships XML
 * @returns Object mapping relationship IDs to targets
 */
export function parseRelationships(relsXml: XmlDocument | null): SlideResources {
  if (relsXml === null) {
    return {};
  }

  const result: SlideResources = {};

  // Get Relationships element from document
  const relationshipsElement = getByPath(relsXml, ["Relationships"]);
  if (!relationshipsElement) {
    return result;
  }

  // Get all Relationship elements
  const relationships = getChildren(relationshipsElement, "Relationship");

  for (const rel of relationships) {
    const id = rel.attrs["Id"];
    const type = rel.attrs["Type"];
    const target = rel.attrs["Target"];

    if (id !== undefined && target !== undefined) {
      result[id] = {
        type: type ?? "",
        target: normalizeTarget(target),
      };
    }
  }

  return result;
}

/**
 * Normalize target path (resolve relative paths)
 * @param target - Target path
 * @returns Normalized path
 */
function normalizeTarget(target: string): string {
  if (target.startsWith("../")) {
    return normalizePptPath(target);
  }
  return target;
}

/**
 * Find first resource target matching the given relationship type
 * @param resObj - Resources object
 * @param relType - Relationship type to find
 * @returns Target filename or undefined
 */
function findResourceByType(resObj: SlideResources, relType: string): string | undefined {
  const found = Object.values(resObj).find((res) => res.type === relType);
  return found?.target;
}

/**
 * Find layout filename from slide relationships
 * @param slideResObj - Slide resources object
 * @returns Layout filename or undefined
 */
export function findLayoutFilename(slideResObj: SlideResources): string | undefined {
  return findResourceByType(slideResObj, RELATIONSHIP_TYPES.SLIDE_LAYOUT);
}

/**
 * Find master filename from layout relationships
 * @param layoutResObj - Layout resources object
 * @returns Master filename or undefined
 */
export function findMasterFilename(layoutResObj: SlideResources): string | undefined {
  return findResourceByType(layoutResObj, RELATIONSHIP_TYPES.SLIDE_MASTER);
}

/**
 * Find theme filename from master relationships
 * @param masterResObj - Master resources object
 * @returns Theme filename or undefined
 */
export function findThemeFilename(masterResObj: SlideResources): string | undefined {
  return findResourceByType(masterResObj, RELATIONSHIP_TYPES.THEME);
}

/**
 * Find diagram drawing filename from relationships
 * @param resObj - Resources object
 * @returns Diagram drawing filename or undefined
 */
export function findDiagramDrawingFilename(resObj: SlideResources): string | undefined {
  return findResourceByType(resObj, RELATIONSHIP_TYPES.DIAGRAM_DRAWING);
}

/**
 * Get resource by relationship ID
 * @param resObj - Resources object
 * @param rId - Relationship ID (e.g., "rId1")
 * @returns Resource object or undefined
 */
export function getResourceById(resObj: SlideResources, rId: string): ResourceObject | undefined {
  return resObj[rId];
}

/**
 * Get all resources of a specific type
 * @param resObj - Resources object
 * @param type - Relationship type
 * @returns Array of matching resources
 */
export function getResourcesByType(resObj: SlideResources, type: string): ResourceObject[] {
  return Object.values(resObj).filter((res) => res.type === type);
}

/**
 * Check if resource is an image
 * @param res - Resource object
 * @returns True if resource is an image
 */
export function isImageResource(res: ResourceObject): boolean {
  return res.type === RELATIONSHIP_TYPES.IMAGE;
}

/**
 * Check if resource is a hyperlink
 * @param res - Resource object
 * @returns True if resource is a hyperlink
 */
export function isHyperlinkResource(res: ResourceObject): boolean {
  return res.type === RELATIONSHIP_TYPES.HYPERLINK;
}
