/**
 * @file build command - build PPTX from JSON specification
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { parseSlide } from "@oxen-office/pptx/parser/slide/slide-parser";
import { serializeShape as domainToXml } from "@oxen-office/pptx/patcher/shape/shape-serializer";
import { addShapeToTree } from "@oxen-office/pptx/patcher/slide/shape-tree-patcher";
import { updateDocumentRoot, updateAtPath } from "@oxen-office/pptx/patcher/core/xml-mutator";
import { parseXml, serializeDocument, getByPath } from "@oxen/xml";
import type { SpShape } from "@oxen-office/pptx/domain/shape";
import type { Pixels, Degrees } from "@oxen-office/ooxml/domain/units";
import { success, error, type Result } from "../output/json-output";

// =============================================================================
// Input Types (JSON spec for building)
// =============================================================================

/**
 * Shape specification for building
 */
export type ShapeSpec = {
  readonly type: "rectangle" | "ellipse" | "roundRect" | "triangle";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text?: string;
  readonly fill?: string; // hex color
  readonly lineColor?: string;
  readonly lineWidth?: number;
};

/**
 * Table cell specification
 */
export type TableCellSpec = {
  readonly text: string;
};

/**
 * Table specification
 */
export type TableSpec = {
  readonly type: "table";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly (readonly TableCellSpec[])[];
};

/**
 * Slide modification specification
 */
export type SlideModSpec = {
  readonly slideNumber: number;
  readonly addShapes?: readonly ShapeSpec[];
  readonly addTables?: readonly TableSpec[];
};

/**
 * Build specification
 */
export type BuildSpec = {
  readonly template: string; // Path to template PPTX
  readonly output: string; // Output path
  readonly slides?: readonly SlideModSpec[];
};

/**
 * Build result
 */
export type BuildData = {
  readonly outputPath: string;
  readonly slideCount: number;
  readonly shapesAdded: number;
};

// =============================================================================
// Shape Building
// =============================================================================

const PRESET_MAP: Record<string, string> = {
  rectangle: "rect",
  ellipse: "ellipse",
  roundRect: "roundRect",
  triangle: "triangle",
};

function generateShapeId(existingIds: readonly string[]): string {
  const maxId = existingIds.reduce((max, id) => {
    const num = parseInt(id, 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return String(maxId + 1);
}

function buildSolidFill(hexColor: string): SpShape["properties"]["fill"] {
  return {
    type: "solidFill",
    color: { spec: { type: "srgb", value: hexColor } },
  };
}

function buildLine(lineColor: string, lineWidth: number): SpShape["properties"]["line"] {
  return {
    width: lineWidth as Pixels,
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: { type: "solidFill", color: { spec: { type: "srgb", value: lineColor } } },
    dash: "solid",
    join: "round",
  };
}

function buildTextBody(text: string): SpShape["textBody"] {
  return {
    bodyProperties: {},
    paragraphs: [{ properties: {}, runs: [{ type: "text", text }] }],
  };
}

function buildSpShape(spec: ShapeSpec, id: string): SpShape {
  const preset = PRESET_MAP[spec.type] ?? "rect";

  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: {
        x: spec.x as Pixels,
        y: spec.y as Pixels,
        width: spec.width as Pixels,
        height: spec.height as Pixels,
        rotation: 0 as Degrees,
        flipH: false,
        flipV: false,
      },
      geometry: { type: "preset", preset, adjustValues: [] },
      fill: spec.fill ? buildSolidFill(spec.fill) : undefined,
      line: spec.lineColor ? buildLine(spec.lineColor, spec.lineWidth ?? 1) : undefined,
    },
    textBody: spec.text ? buildTextBody(spec.text) : undefined,
  };
}

// =============================================================================
// Slide Processing
// =============================================================================

type SlideContext = {
  readonly zipPackage: { readText(path: string): string | null; writeText(path: string, content: string): void };
  readonly presentation: { count: number; getSlide(n: number): { filename: string; content: unknown } };
};

type ProcessSlideResult = { readonly success: true; readonly shapesAdded: number } | { readonly success: false; readonly error: Result<BuildData> };

function getShapeId(shape: { type: string; nonVisual?: { id: string } }): string {
  return shape.type === "contentPart" ? "0" : shape.nonVisual?.id ?? "0";
}

function getExistingShapeIds(apiSlide: { content: unknown }): string[] {
  const domainSlide = parseSlide(apiSlide.content);
  if (!domainSlide) {
    return [];
  }
  return domainSlide.shapes.map(getShapeId);
}

function addShapesToDocument(
  slideDoc: ReturnType<typeof parseXml>,
  shapes: readonly ShapeSpec[],
  existingIds: string[],
): { readonly doc: ReturnType<typeof parseXml>; readonly added: number } {
  return shapes.reduce(
    (acc, shapeSpec) => {
      const newId = generateShapeId(existingIds);
      existingIds.push(newId);
      const spShape = buildSpShape(shapeSpec, newId);
      const shapeXml = domainToXml(spShape);
      const doc = updateDocumentRoot(acc.doc, (root) =>
        updateAtPath(root, ["p:cSld", "p:spTree"], (tree) => addShapeToTree(tree, shapeXml)),
      );
      return { doc, added: acc.added + 1 };
    },
    { doc: slideDoc, added: 0 },
  );
}

function processSlide(ctx: SlideContext, slideMod: SlideModSpec): ProcessSlideResult {
  const slideNum = slideMod.slideNumber;
  if (slideNum < 1 || slideNum > ctx.presentation.count) {
    return { success: false, error: error("INVALID_SLIDE", `Slide ${slideNum} not found. Valid range: 1-${ctx.presentation.count}`) };
  }

  const apiSlide = ctx.presentation.getSlide(slideNum);
  const slidePath = `ppt/slides/${apiSlide.filename}.xml`;
  const slideXml = ctx.zipPackage.readText(slidePath);

  if (!slideXml) {
    return { success: false, error: error("SLIDE_NOT_FOUND", `Could not read slide XML: ${slidePath}`) };
  }

  const slideDoc = parseXml(slideXml);
  const spTree = getByPath(slideDoc, ["p:sld", "p:cSld", "p:spTree"]);

  if (!spTree) {
    return { success: false, error: error("INVALID_SLIDE", `Invalid slide structure: ${slidePath}`) };
  }

  const existingIds = getExistingShapeIds(apiSlide);
  const shapesToAdd = slideMod.addShapes ?? [];
  const { doc: updatedDoc, added } = addShapesToDocument(slideDoc, shapesToAdd, existingIds);

  const updatedXml = serializeDocument(updatedDoc, { declaration: true, standalone: true });
  ctx.zipPackage.writeText(slidePath, updatedXml);

  return { success: true, shapesAdded: added };
}

// =============================================================================
// Main Build Function
// =============================================================================

/**
 * Build a PPTX file from JSON specification.
 */
export async function runBuild(specPath: string): Promise<Result<BuildData>> {
  try {
    const specJson = await fs.readFile(specPath, "utf-8");
    const spec: BuildSpec = JSON.parse(specJson);

    const templateBuffer = await fs.readFile(spec.template);
    const { zipPackage, presentationFile } = await loadPptxBundleFromBuffer(templateBuffer);
    const presentation = openPresentation(presentationFile);

    const ctx: SlideContext = { zipPackage, presentation };
    const slides = spec.slides ?? [];

    // Process slides and accumulate results
    const processResults = slides.map((slideMod) => processSlide(ctx, slideMod));
    const firstError = processResults.find((r): r is { success: false; error: Result<BuildData> } => !r.success);

    if (firstError) {
      return firstError.error;
    }

    const shapesAdded = processResults
      .filter((r): r is { success: true; shapesAdded: number } => r.success)
      .reduce((sum, r) => sum + r.shapesAdded, 0);

    const outputBuffer = await zipPackage.toArrayBuffer();
    await fs.writeFile(spec.output, Buffer.from(outputBuffer));

    return success({ outputPath: spec.output, slideCount: presentation.count, shapesAdded });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${(err as NodeJS.ErrnoException).path}`);
    }
    if (err instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${err.message}`);
    }
    return error("BUILD_ERROR", `Build failed: ${(err as Error).message}`);
  }
}
