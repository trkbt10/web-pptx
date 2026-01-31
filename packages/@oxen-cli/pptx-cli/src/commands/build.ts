/**
 * @file build command - build PPTX from JSON specification
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx/app";
import { parseSlide } from "@oxen-office/pptx/parser/slide/slide-parser";
import { parseXml, serializeDocument, getByPath } from "@oxen/xml";
import { success, error, type Result } from "../output/json-output";

// Re-export CLI-specific types for external consumers
// NOTE: Domain types (PresetShapeType, AnimationTrigger, AnimationDirection, etc.)
// should be imported directly from @oxen-office packages by consumers.
export type {
  ShapeSpec,
  ImageSpec,
  ConnectorSpec,
  GroupSpec,
  TableSpec,
  TableCellSpec,
  TableUpdateSpec,
  TableCellUpdateSpec,
  TableRowAddSpec,
  TableColumnAddSpec,
  SlideModSpec,
  BuildSpec,
  BuildData,
  BackgroundFillSpec,
  SlideAddSpec,
  SlideRemoveSpec,
  SlideReorderSpec,
  SlideDuplicateSpec,
  AnimationSpec,
  AnimationClassSpec,
  CommentSpec,
  NotesSpec,
  SmartArtUpdateSpec,
  DiagramChangeSpec,
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
import { applySlideOperations } from "./build/slide-operations";
import { applyTableUpdates } from "./build/table-update-builder";
import { applyAnimations } from "./build/animation-builder";
import { applyComments } from "./build/comment-builder";
import { applyNotes } from "./build/notes-builder";
import { applySmartArtUpdates } from "./build/smartart-builder";
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

type BackgroundSpec = SlideModSpec["background"];

async function applyBackgroundSpec(
  slideDoc: ReturnType<typeof parseXml>,
  spec: BackgroundSpec,
  ctx: BuildContext,
): Promise<ReturnType<typeof parseXml>> {
  if (!spec) {
    return slideDoc;
  }
  if (isImageBackground(spec)) {
    return applyImageBackground(slideDoc, spec, ctx);
  }
  return applyBackground(slideDoc, spec);
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
  const docWithBackground = await applyBackgroundSpec(slideDoc, slideMod.background, buildCtx);

  // Process all element types through the registry
  const { doc: afterShapes, added: shapesAdded } = addElementsSync({
    slideDoc: docWithBackground,
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

  // Apply table updates
  const { doc: afterTableUpdates } = applyTableUpdates(afterCharts, slideMod.updateTables ?? []);

  // Apply animations
  const { doc: afterAnimations } = applyAnimations(afterTableUpdates, slideMod.addAnimations ?? []);

  // Apply comments (directly to the package, not to XML document)
  if (slideMod.addComments && slideMod.addComments.length > 0) {
    applyComments(ctx.zipPackage, slidePath, slideMod.addComments);
  }

  // Apply speaker notes (directly to the package)
  if (slideMod.speakerNotes) {
    applyNotes(ctx.zipPackage, slidePath, slideMod.speakerNotes);
  }

  // Apply SmartArt updates (directly to the package)
  if (slideMod.updateSmartArt && slideMod.updateSmartArt.length > 0) {
    applySmartArtUpdates(ctx.zipPackage, slidePath, slideMod.updateSmartArt);
  }

  const finalDoc = slideMod.transition ? applySlideTransition(afterAnimations, slideMod.transition) : afterAnimations;

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

    if (spec.theme) {
      applyThemeEditsToPackage(zipPackage as ZipPackage, spec.theme);
    }

    // Apply slide structure operations (add/duplicate/reorder/remove) before content modifications
    const hasSlideOps =
      (spec.addSlides && spec.addSlides.length > 0) ||
      (spec.duplicateSlides && spec.duplicateSlides.length > 0) ||
      (spec.reorderSlides && spec.reorderSlides.length > 0) ||
      (spec.removeSlides && spec.removeSlides.length > 0);

    if (hasSlideOps) {
      const slideOpsResult = await applySlideOperations(zipPackage as ZipPackage, {
        addSlides: spec.addSlides,
        duplicateSlides: spec.duplicateSlides,
        reorderSlides: spec.reorderSlides,
        removeSlides: spec.removeSlides,
      });

      if (!slideOpsResult.success) {
        return slideOpsResult.error;
      }
    }

    // Re-open presentation after slide operations to get updated slide count
    const presentation = openPresentation(presentationFile);

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
