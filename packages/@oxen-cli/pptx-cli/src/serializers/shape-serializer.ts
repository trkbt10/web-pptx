/**
 * @file Shape serialization for CLI output
 */

import type {
  Shape,
  Placeholder,
  GraphicContent,
  TableReference,
  ChartReference,
  DiagramReference,
  Geometry,
  PresetGeometry,
  CustomGeometry,
  ShapeProperties,
  ShapeStyle,
} from "@oxen-office/pptx/domain/shape";
import type { Paragraph, TextRun, ParagraphProperties, RunProperties } from "@oxen-office/pptx/domain/text";
import type { Transform } from "@oxen-office/pptx/domain/geometry";
import type { TableRow, TableCell } from "@oxen-office/pptx/domain/table/types";
import type { Fill, Line } from "@oxen-office/pptx/domain/color/types";
import { extractTextFromShape, extractTextFromParagraph, extractTextFromBody } from "./text-serializer";

// =============================================================================
// Base Types
// =============================================================================

/**
 * Bounds information for a shape
 */
export type BoundsJson = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Paragraph properties for JSON output
 */
export type ParagraphPropertiesJson = {
  readonly level?: number;
  readonly alignment?: string;
  readonly bulletType?: string;
};

/**
 * Run properties for JSON output
 */
export type RunPropertiesJson = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly fontSize?: number;
  readonly fontFamily?: string;
};

/**
 * Text run for JSON output
 */
export type TextRunJson = {
  readonly type: "text" | "break" | "field";
  readonly text: string;
  readonly properties?: RunPropertiesJson;
};

/**
 * Paragraph for JSON output
 */
export type ParagraphJson = {
  readonly text: string;
  readonly runs: readonly TextRunJson[];
  readonly properties?: ParagraphPropertiesJson;
};

/**
 * Placeholder for JSON output
 */
export type PlaceholderJson = {
  readonly type?: string;
  readonly idx?: number;
};

// =============================================================================
// Geometry Types
// =============================================================================

/**
 * Geometry info for JSON output
 */
export type GeometryJson = {
  readonly kind: "preset" | "custom";
  readonly preset?: string;
  readonly adjustValues?: readonly { name: string; value: number }[];
  readonly pathCount?: number;
};

// =============================================================================
// Fill/Line Types
// =============================================================================

/**
 * Fill info for JSON output
 */
export type FillJson = {
  readonly type: string;
  readonly color?: string;
  readonly resourceId?: string;
};

/**
 * Line info for JSON output
 */
export type LineJson = {
  readonly width?: number;
  readonly color?: string;
  readonly dashStyle?: string;
};

// =============================================================================
// Table Types
// =============================================================================

/**
 * Table cell for JSON output
 */
export type TableCellJson = {
  readonly text: string;
  readonly rowSpan?: number;
  readonly colSpan?: number;
};

/**
 * Table row for JSON output
 */
export type TableRowJson = {
  readonly height: number;
  readonly cells: readonly TableCellJson[];
};

/**
 * Table info for JSON output
 */
export type TableJson = {
  readonly rows: number;
  readonly cols: number;
  readonly data: readonly TableRowJson[];
  readonly styleId?: string;
};

// =============================================================================
// Chart Types
// =============================================================================

/**
 * Chart info for JSON output
 */
export type ChartJson = {
  readonly resourceId: string;
};

// =============================================================================
// Diagram Types
// =============================================================================

/**
 * Diagram info for JSON output
 */
export type DiagramJson = {
  readonly dataResourceId?: string;
  readonly layoutResourceId?: string;
  readonly styleResourceId?: string;
  readonly colorResourceId?: string;
};

// =============================================================================
// Graphic Content Types
// =============================================================================

/**
 * Graphic content for JSON output
 */
export type GraphicContentJson =
  | { readonly type: "table"; readonly table: TableJson }
  | { readonly type: "chart"; readonly chart: ChartJson }
  | { readonly type: "diagram"; readonly diagram: DiagramJson }
  | { readonly type: "oleObject"; readonly progId?: string }
  | { readonly type: "unknown"; readonly uri: string };

// =============================================================================
// Shape Style Types
// =============================================================================

/**
 * Shape style reference for JSON output
 */
export type StyleReferenceJson = {
  readonly lineRef?: number;
  readonly fillRef?: number;
  readonly effectRef?: number;
  readonly fontRef?: string;
};

// =============================================================================
// Main Shape Type
// =============================================================================

/**
 * Serialized shape for JSON output
 */
export type ShapeJson = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly placeholder?: PlaceholderJson;
  readonly bounds?: BoundsJson;
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  readonly text?: string;
  readonly paragraphs?: readonly ParagraphJson[];
  readonly resourceId?: string;
  readonly children?: readonly ShapeJson[];
  readonly geometry?: GeometryJson;
  readonly fill?: FillJson;
  readonly line?: LineJson;
  readonly style?: StyleReferenceJson;
  readonly content?: GraphicContentJson;
  readonly connection?: {
    readonly startShapeId?: string;
    readonly endShapeId?: string;
  };
};

// =============================================================================
// Serialization Functions
// =============================================================================

function serializeBounds(transform: Transform | undefined): BoundsJson | undefined {
  if (!transform) {
    return undefined;
  }
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

function serializePlaceholder(placeholder: Placeholder | undefined): PlaceholderJson | undefined {
  if (!placeholder) {
    return undefined;
  }
  return {
    type: placeholder.type,
    idx: placeholder.idx,
  };
}

function serializeRunProperties(props: RunProperties | undefined): RunPropertiesJson | undefined {
  if (!props) {
    return undefined;
  }
  const result: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFamily?: string;
  } = {};
  if (props.bold !== undefined) {
    result.bold = props.bold;
  }
  if (props.italic !== undefined) {
    result.italic = props.italic;
  }
  if (props.fontSize !== undefined) {
    result.fontSize = props.fontSize;
  }
  if (props.fontFamily !== undefined) {
    result.fontFamily = props.fontFamily;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeRun(run: TextRun): TextRunJson {
  const text = run.type === "text" ? run.text : run.type === "field" ? run.text : "";
  return {
    type: run.type,
    text,
    properties: serializeRunProperties(run.properties),
  };
}

function serializeParagraphProperties(props: ParagraphProperties): ParagraphPropertiesJson | undefined {
  const result: {
    level?: number;
    alignment?: string;
    bulletType?: string;
  } = {};
  if (props.level !== undefined) {
    result.level = props.level;
  }
  if (props.alignment !== undefined) {
    result.alignment = props.alignment;
  }
  if (props.bulletStyle?.bullet?.type !== undefined && props.bulletStyle.bullet.type !== "none") {
    result.bulletType = props.bulletStyle.bullet.type;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeParagraph(paragraph: Paragraph): ParagraphJson {
  return {
    text: extractTextFromParagraph(paragraph),
    runs: paragraph.runs.map(serializeRun),
    properties: serializeParagraphProperties(paragraph.properties),
  };
}

function serializeGeometry(geometry: Geometry | undefined): GeometryJson | undefined {
  if (!geometry) {
    return undefined;
  }
  if (geometry.type === "preset") {
    const preset = geometry as PresetGeometry;
    return {
      kind: "preset",
      preset: preset.preset,
      adjustValues: preset.adjustValues.length > 0 ? preset.adjustValues : undefined,
    };
  }
  const custom = geometry as CustomGeometry;
  return {
    kind: "custom",
    pathCount: custom.paths.length,
    adjustValues: custom.adjustValues && custom.adjustValues.length > 0 ? custom.adjustValues : undefined,
  };
}

function getColorValue(color: { spec: { type: string; value?: string } } | undefined): string | undefined {
  if (!color) {
    return undefined;
  }
  if (color.spec.type === "srgb" && color.spec.value) {
    return color.spec.value;
  }
  if (color.spec.type === "scheme" && color.spec.value) {
    return `scheme:${color.spec.value}`;
  }
  return undefined;
}

function serializeFill(fill: Fill | undefined): FillJson | undefined {
  if (!fill) {
    return undefined;
  }
  switch (fill.type) {
    case "solidFill":
      return { type: "solid", color: getColorValue(fill.color) };
    case "gradientFill":
      return { type: "gradient" };
    case "patternFill":
      return { type: "pattern" };
    case "blipFill":
      return { type: "blip", resourceId: fill.resourceId };
    case "groupFill":
      return { type: "group" };
    case "noFill":
      return { type: "none" };
    default:
      return { type: "unknown" };
  }
}

function serializeLine(line: Line | undefined): LineJson | undefined {
  if (!line) {
    return undefined;
  }
  const result: { width?: number; color?: string; dashStyle?: string } = {};
  if (line.width !== undefined) {
    result.width = line.width;
  }
  if (line.fill?.type === "solidFill") {
    const colorValue = getColorValue(line.fill.color);
    if (colorValue) {
      result.color = colorValue;
    }
  }
  if (line.dash !== undefined && typeof line.dash === "string") {
    result.dashStyle = line.dash;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeStyle(style: ShapeStyle | undefined): StyleReferenceJson | undefined {
  if (!style) {
    return undefined;
  }
  const result: { lineRef?: number; fillRef?: number; effectRef?: number; fontRef?: string } = {};
  if (style.lineReference?.index !== undefined) {
    result.lineRef = style.lineReference.index;
  }
  if (style.fillReference?.index !== undefined) {
    result.fillRef = style.fillReference.index;
  }
  if (style.effectReference?.index !== undefined) {
    result.effectRef = style.effectReference.index;
  }
  if (style.fontReference?.index !== undefined) {
    result.fontRef = style.fontReference.index;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeTableCell(cell: TableCell): TableCellJson {
  const text = cell.textBody ? extractTextFromBody(cell.textBody) : "";
  const result: { text: string; rowSpan?: number; colSpan?: number } = { text };
  if (cell.properties.rowSpan && cell.properties.rowSpan > 1) {
    result.rowSpan = cell.properties.rowSpan;
  }
  if (cell.properties.colSpan && cell.properties.colSpan > 1) {
    result.colSpan = cell.properties.colSpan;
  }
  return result;
}

function serializeTableRow(row: TableRow): TableRowJson {
  return {
    height: row.height,
    cells: row.cells.map(serializeTableCell),
  };
}

function serializeTable(tableRef: TableReference): TableJson {
  const table = tableRef.table;
  return {
    rows: table.rows.length,
    cols: table.grid.columns.length,
    data: table.rows.map(serializeTableRow),
    styleId: table.properties.tableStyleId,
  };
}

function serializeChart(chartRef: ChartReference): ChartJson {
  return {
    resourceId: chartRef.resourceId,
  };
}

function serializeDiagram(diagramRef: DiagramReference): DiagramJson {
  return {
    dataResourceId: diagramRef.dataResourceId,
    layoutResourceId: diagramRef.layoutResourceId,
    styleResourceId: diagramRef.styleResourceId,
    colorResourceId: diagramRef.colorResourceId,
  };
}

function serializeGraphicContent(content: GraphicContent): GraphicContentJson {
  switch (content.type) {
    case "table":
      return { type: "table", table: serializeTable(content.data) };
    case "chart":
      return { type: "chart", chart: serializeChart(content.data) };
    case "diagram":
      return { type: "diagram", diagram: serializeDiagram(content.data) };
    case "oleObject":
      return { type: "oleObject", progId: content.data.progId };
    case "unknown":
      return { type: "unknown", uri: content.uri };
  }
}

function serializeShapeProperties(props: ShapeProperties): {
  geometry?: GeometryJson;
  fill?: FillJson;
  line?: LineJson;
} {
  return {
    geometry: serializeGeometry(props.geometry),
    fill: serializeFill(props.fill),
    line: serializeLine(props.line),
  };
}

/**
 * Serialize a Shape to JSON-friendly format
 */
export function serializeShape(shape: Shape): ShapeJson {
  switch (shape.type) {
    case "sp": {
      const text = extractTextFromShape(shape);
      const { geometry, fill, line } = serializeShapeProperties(shape.properties);
      const transform = shape.properties.transform;
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        placeholder: serializePlaceholder(shape.placeholder),
        bounds: serializeBounds(transform),
        rotation: transform?.rotation !== 0 ? transform?.rotation : undefined,
        flipH: transform?.flipH || undefined,
        flipV: transform?.flipV || undefined,
        text: text || undefined,
        paragraphs: shape.textBody?.paragraphs.map(serializeParagraph),
        geometry,
        fill,
        line,
        style: serializeStyle(shape.style),
      };
    }
    case "pic": {
      const { fill, line } = serializeShapeProperties(shape.properties);
      const transform = shape.properties.transform;
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        bounds: serializeBounds(transform),
        rotation: transform?.rotation !== 0 ? transform?.rotation : undefined,
        flipH: transform?.flipH || undefined,
        flipV: transform?.flipV || undefined,
        resourceId: shape.blipFill.resourceId,
        fill,
        line,
        style: serializeStyle(shape.style),
      };
    }
    case "grpSp": {
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        children: shape.children.map(serializeShape),
      };
    }
    case "cxnSp": {
      const { geometry, fill, line } = serializeShapeProperties(shape.properties);
      const transform = shape.properties.transform;
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        bounds: serializeBounds(transform),
        rotation: transform?.rotation !== 0 ? transform?.rotation : undefined,
        geometry,
        fill,
        line,
        style: serializeStyle(shape.style),
        connection: {
          startShapeId: shape.nonVisual.startConnection?.shapeId,
          endShapeId: shape.nonVisual.endConnection?.shapeId,
        },
      };
    }
    case "graphicFrame": {
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        bounds: serializeBounds(shape.transform),
        rotation: shape.transform?.rotation !== 0 ? shape.transform?.rotation : undefined,
        content: serializeGraphicContent(shape.content),
      };
    }
    case "contentPart": {
      return {
        id: "contentPart",
        name: "contentPart",
        type: shape.type,
      };
    }
  }
}
