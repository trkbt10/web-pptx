/**
 * @file Internal types for PPTX reader
 * Types used within the reader module for slide processing
 */

import type { XmlDocument, XmlElement } from "../../xml";
import type { IndexTables } from "../core/types";
import type { SlideResources } from "../core/opc";

/**
 * Complete slide data for creating Slide objects
 * Contains all parsed XML and relationships needed for rendering
 */
export type SlideData = {
  /** Slide number (1-based) */
  number: number;
  /** Filename without extension */
  filename: string;
  /** Parsed slide content (p:sld) */
  content: XmlDocument;
  /** Parsed slide layout (p:sldLayout) */
  layout: XmlDocument | null;
  /** Layout index tables for shape lookup */
  layoutTables: IndexTables;
  /** Parsed slide master (p:sldMaster) */
  master: XmlDocument | null;
  /** Master index tables for shape lookup */
  masterTables: IndexTables;
  /** Master text styles (p:txStyles) */
  masterTextStyles: XmlElement | undefined;
  /** Parsed theme (a:theme) */
  theme: XmlDocument | null;
  /** Slide relationships */
  relationships: SlideResources;
  /** Layout relationships */
  layoutRelationships: SlideResources;
  /** Master relationships */
  masterRelationships: SlideResources;
  /** Theme relationships */
  themeRelationships: SlideResources;
  /** Theme override documents */
  themeOverrides: XmlDocument[];
  /** Diagram content if present */
  diagram: XmlDocument | null;
  /** Diagram relationships */
  diagramRelationships: SlideResources;
};

/**
 * Layout data loaded from slide relationships
 */
export type LayoutData = {
  layout: XmlDocument | null;
  layoutTables: IndexTables;
  layoutRelationships: SlideResources;
};

/**
 * Master data loaded from layout relationships
 */
export type MasterData = {
  master: XmlDocument | null;
  masterTables: IndexTables;
  masterTextStyles: XmlElement | undefined;
  masterRelationships: SlideResources;
};

/**
 * Theme data loaded from master relationships
 */
export type ThemeData = {
  theme: XmlDocument | null;
  themeRelationships: SlideResources;
  themeOverrides: XmlDocument[];
};

/**
 * Diagram data loaded from slide relationships
 */
export type DiagramData = {
  diagram: XmlDocument | null;
  diagramRelationships: SlideResources;
};
