/**
 * @file build command - build PPTX from JSON specification
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { parseSlide } from "@oxen-office/pptx/parser/slide/slide-parser";
import { parseXml, serializeDocument, getByPath } from "@oxen/xml";
import { success, error, type Result } from "../output/json-output";

// Re-export types for external consumers
export type {
  PresetShapeType,
  ShapeSpec,
  ImageSpec,
  ConnectorSpec,
  GroupSpec,
  TableSpec,
  TableCellSpec,
  SlideModSpec,
  BuildSpec,
  BuildData,
  BackgroundFillSpec,
} from "./build/types";

import type { SlideModSpec, BuildSpec, BuildData } from "./build/types";
import { applyBackground, applyImageBackground, isImageBackground } from "./build/background-builder";
import { addChartsToSlide } from "./build/chart-add-builder";
import { applyChartUpdates } from "./build/chart-builder";
import { applyThemeEditsToPackage } from "./build/theme-builder";
import {
  type BuildContext,
  shapeBuilder,
  imageBuilder,
  connectorBuilder,
  groupBuilder,
  tableBuilder,
  addElementsSync,
  addElementsAsync,
} from "./build/registry";
import { applySlideTransition } from "./build/transition-builder";
import type { ZipPackage } from "@oxen/zip";

// =============================================================================
// Slide Processing
// =============================================================================

type SlideContext = {
  readonly zipPackage: ZipPackage;
  readonly presentation: { count: number; getSlide(n: number): { filename: string; content: unknown } };
  readonly specDir: string;
};

type ProcessSlideResult =
  | { readonly success: true; readonly shapesAdded: number }
  | { readonly success: false; readonly error: Result<BuildData> };

function getShapeId(shape: { type: string; nonVisual?: { id: string } }): string {
  return shape.type === "contentPart" ? "0" : shape.nonVisual?.id ?? "0";
}

function getExistingShapeIds(apiSlide: { content: unknown }): string[] {
  const domainSlide = parseSlide(apiSlide.content as Parameters<typeof parseSlide>[0]);
  if (!domainSlide) {
    return [];
  }
  return domainSlide.shapes.map(getShapeId);
}

async function processSlide(ctx: SlideContext, slideMod: SlideModSpec): Promise<ProcessSlideResult> {
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
  const buildCtx: BuildContext = {
    existingIds,
    specDir: ctx.specDir,
    zipPackage: ctx.zipPackage,
    slidePath,
  };

  // Apply background if specified
  let currentDoc = slideDoc;
  if (slideMod.background) {
    if (isImageBackground(slideMod.background)) {
      currentDoc = await applyImageBackground(currentDoc, slideMod.background, buildCtx);
    } else {
      currentDoc = applyBackground(currentDoc, slideMod.background);
    }
  }

  // Process all element types through the registry
  const { doc: afterShapes, added: shapesAdded } = addElementsSync({
    slideDoc: currentDoc,
    specs: slideMod.addShapes ?? [],
    existingIds,
    ctx: buildCtx,
    builder: shapeBuilder,
  });

  const { doc: afterImages, added: imagesAdded } = await addElementsAsync({
    slideDoc: afterShapes,
    specs: slideMod.addImages ?? [],
    existingIds,
    ctx: buildCtx,
    builder: imageBuilder,
  });

  const { doc: afterConnectors, added: connectorsAdded } = addElementsSync({
    slideDoc: afterImages,
    specs: slideMod.addConnectors ?? [],
    existingIds,
    ctx: buildCtx,
    builder: connectorBuilder,
  });

  const { doc: afterGroups, added: groupsAdded } = addElementsSync({
    slideDoc: afterConnectors,
    specs: slideMod.addGroups ?? [],
    existingIds,
    ctx: buildCtx,
    builder: groupBuilder,
  });

  const { doc: afterTables, added: tablesAdded } = addElementsSync({
    slideDoc: afterGroups,
    specs: slideMod.addTables ?? [],
    existingIds,
    ctx: buildCtx,
    builder: tableBuilder,
  });

  const { doc: afterChartAdds } = addChartsToSlide({
    slideDoc: afterTables,
    specs: slideMod.addCharts ?? [],
    ctx: { zipPackage: ctx.zipPackage, slidePath, existingIds },
  });

  const { doc: afterCharts } = applyChartUpdates(
    afterChartAdds,
    { zipPackage: ctx.zipPackage, slidePath },
    slideMod.updateCharts ?? [],
  );

  const finalDoc = slideMod.transition ? applySlideTransition(afterCharts, slideMod.transition) : afterCharts;

  const totalAdded = shapesAdded + imagesAdded + connectorsAdded + groupsAdded + tablesAdded;

  const updatedXml = serializeDocument(finalDoc, { declaration: true, standalone: true });
  ctx.zipPackage.writeText(slidePath, updatedXml);

  return { success: true, shapesAdded: totalAdded };
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
    const specDir = path.dirname(specPath);

    const templatePath = path.resolve(specDir, spec.template);
    const templateBuffer = await fs.readFile(templatePath);
    const { zipPackage, presentationFile } = await loadPptxBundleFromBuffer(templateBuffer);
    const presentation = openPresentation(presentationFile);

    if (spec.theme) {
      applyThemeEditsToPackage(zipPackage as ZipPackage, spec.theme);
    }

    const ctx: SlideContext = { zipPackage: zipPackage as ZipPackage, presentation, specDir };
    const slides = spec.slides ?? [];

    // Process slides sequentially (for async image loading)
    const processResults: ProcessSlideResult[] = [];
    for (const slideMod of slides) {
      const result = await processSlide(ctx, slideMod);
      processResults.push(result);
      if (!result.success) {
        break;
      }
    }

    const firstError = processResults.find((r): r is { success: false; error: Result<BuildData> } => !r.success);
    if (firstError) {
      return firstError.error;
    }

    const shapesAdded = processResults
      .filter((r): r is { success: true; shapesAdded: number } => r.success)
      .reduce((sum, r) => sum + r.shapesAdded, 0);

    const outputPath = path.resolve(specDir, spec.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const outputBuffer = await zipPackage.toArrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(outputBuffer));

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
