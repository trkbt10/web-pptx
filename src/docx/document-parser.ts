/**
 * @file DOCX Document Parser (Main Entry Point)
 *
 * Loads and parses DOCX files from OPC packages.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

import JSZip from "jszip";
import { parseXml, isXmlElement, type XmlElement, type XmlDocument } from "../xml";
import type { DocxDocument, DocxRelationships, DocxRelationship } from "./domain/document";
import type { DocxStyles } from "./domain/styles";
import type { DocxNumbering } from "./domain/numbering";
import { createParseContext } from "./parser/context";
import { parseDocument } from "./parser/document";
import { parseStyles } from "./parser/styles";
import { parseNumbering } from "./parser/numbering";
import { DEFAULT_PART_PATHS, RELATIONSHIP_TYPES } from "./constants";
import { docxRelId } from "./domain/types";

// =============================================================================
// Relationship Parsing
// =============================================================================

/**
 * Get root element from XmlDocument.
 */
function getRootElement(doc: XmlDocument): XmlElement | undefined {
  for (const child of doc.children) {
    if (isXmlElement(child)) {
      return child;
    }
  }
  return undefined;
}

/**
 * Parse relationships from .rels file.
 */
function parseRelationships(element: XmlElement): DocxRelationships {
  const relationships: DocxRelationship[] = [];

  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}

    const rel = node;
    if (rel.name === "Relationship" || rel.name.endsWith(":Relationship")) {
      const id = rel.attrs.Id;
      const type = rel.attrs.Type;
      const target = rel.attrs.Target;

      if (id && type && target) {
        relationships.push({
          id: docxRelId(id),
          type,
          target,
          targetMode: rel.attrs.TargetMode === "External" ? "External" : "Internal",
        });
      }
    }
  }

  return { relationship: relationships };
}

/**
 * Get relationship by type.
 */
function getRelationshipByType(
  relationships: DocxRelationships,
  type: string
): DocxRelationship | undefined {
  return relationships.relationship.find((r) => r.type === type);
}

// =============================================================================
// Part Loading
// =============================================================================

/**
 * Load and parse XML from a ZIP path.
 */
async function loadXmlPart(zip: JSZip, path: string): Promise<XmlElement | undefined> {
  const file = zip.file(path);
  if (!file) {
    return undefined;
  }

  const content = await file.async("text");
  const doc = parseXml(content);
  return getRootElement(doc);
}

/**
 * Resolve relative path from source to target.
 */
function resolvePath(sourcePath: string, targetPath: string): string {
  if (targetPath.startsWith("/")) {
    return targetPath.slice(1);
  }

  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
  const parts = [...sourceDir.split("/"), ...targetPath.split("/")];

  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }

  return resolved.join("/");
}

/**
 * Normalize document path by removing leading slash.
 */
function normalizeDocumentPath(target: string): string {
  return target.startsWith("/") ? target.slice(1) : target;
}

/**
 * Load styles from document relationships.
 */
async function loadStyles(
  zip: JSZip,
  documentPath: string,
  relationships: DocxRelationships,
  shouldParse: boolean,
): Promise<DocxStyles | undefined> {
  if (!shouldParse) {return undefined;}
  const rel = getRelationshipByType(relationships, RELATIONSHIP_TYPES.styles);
  if (!rel) {return undefined;}
  const path = resolvePath(documentPath, rel.target);
  const element = await loadXmlPart(zip, path);
  if (!element) {return undefined;}
  return parseStyles(element);
}

/**
 * Load numbering from document relationships.
 */
async function loadNumbering(
  zip: JSZip,
  documentPath: string,
  relationships: DocxRelationships,
  shouldParse: boolean,
): Promise<DocxNumbering | undefined> {
  if (!shouldParse) {return undefined;}
  const rel = getRelationshipByType(relationships, RELATIONSHIP_TYPES.numbering);
  if (!rel) {return undefined;}
  const path = resolvePath(documentPath, rel.target);
  const element = await loadXmlPart(zip, path);
  if (!element) {return undefined;}
  return parseNumbering(element);
}

/**
 * Load document relationships.
 */
async function loadDocumentRelationships(zip: JSZip, path: string): Promise<DocxRelationships> {
  const element = await loadXmlPart(zip, path);
  return element ? parseRelationships(element) : { relationship: [] };
}

// =============================================================================
// Document Loading
// =============================================================================

/**
 * Load options for the document parser.
 */
export type LoadDocxOptions = {
  /** Whether to parse styles.xml */
  readonly parseStyles?: boolean;
  /** Whether to parse numbering.xml */
  readonly parseNumbering?: boolean;
};

/**
 * Default load options.
 */
const DEFAULT_OPTIONS: Required<LoadDocxOptions> = {
  parseStyles: true,
  parseNumbering: true,
};

/**
 * Load and parse a DOCX file from a buffer or Uint8Array.
 *
 * @param data - The DOCX file data
 * @param options - Loading options
 * @returns Parsed DOCX document
 *
 * @example
 * ```typescript
 * const buffer = await fs.readFile("document.docx");
 * const doc = await loadDocx(buffer);
 * console.log(doc.body.content.length);
 * ```
 */
export async function loadDocx(
  data: ArrayBuffer | Uint8Array,
  options: LoadDocxOptions = {}
): Promise<DocxDocument> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const zip = await JSZip.loadAsync(data);

  // 1. Parse root relationships to find the main document
  const rootRels = await loadXmlPart(zip, DEFAULT_PART_PATHS.rootRels);
  if (!rootRels) {
    throw new Error("Cannot find root relationships file");
  }

  const rootRelationships = parseRelationships(rootRels);
  const documentRel = getRelationshipByType(rootRelationships, RELATIONSHIP_TYPES.officeDocument);

  if (!documentRel) {
    throw new Error("Cannot find main document relationship");
  }

  const documentPath = normalizeDocumentPath(documentRel.target);

  // 2. Parse document relationships
  const documentRelsPath = resolvePath(documentPath, "_rels/" + documentPath.split("/").pop() + ".rels");
  const documentRelationships = await loadDocumentRelationships(zip, documentRelsPath);

  // 3. Parse styles and numbering
  const styles = await loadStyles(zip, documentPath, documentRelationships, opts.parseStyles);
  const numbering = await loadNumbering(zip, documentPath, documentRelationships, opts.parseNumbering);

  // 4. Create parse context
  const context = createParseContext({
    styles,
    numbering,
    relationships: documentRelationships,
  });

  // 5. Parse main document
  const documentElement = await loadXmlPart(zip, documentPath);
  if (!documentElement) {
    throw new Error(`Cannot find main document at ${documentPath}`);
  }

  const document = parseDocument(documentElement, context);

  // 6. Combine all parts
  return {
    ...document,
    styles,
    numbering,
    relationships: documentRelationships,
  };
}

/**
 * Load and parse a DOCX file from a File object (browser).
 *
 * @param file - The File object
 * @param options - Loading options
 * @returns Parsed DOCX document
 *
 * @example
 * ```typescript
 * const input = document.querySelector('input[type="file"]');
 * const file = input.files[0];
 * const doc = await loadDocxFromFile(file);
 * ```
 */
export async function loadDocxFromFile(
  file: File,
  options: LoadDocxOptions = {}
): Promise<DocxDocument> {
  const buffer = await file.arrayBuffer();
  return loadDocx(buffer, options);
}
