/**
 * @file show command - display slide content
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { parseSlide } from "@oxen-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "../output/json-output";
import { serializeShape, type ShapeJson } from "../serializers/shape-serializer";

export type ShowData = {
  readonly number: number;
  readonly filename: string;
  readonly shapes: readonly ShapeJson[];
};

/**
 * Display content of a specific slide in a PPTX file.
 */
export async function runShow(filePath: string, slideNumber: number): Promise<Result<ShowData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const { presentationFile } = await loadPptxBundleFromBuffer(buffer);
    const presentation = openPresentation(presentationFile);

    if (slideNumber < 1 || slideNumber > presentation.count) {
      return error(
        "SLIDE_NOT_FOUND",
        `Slide ${slideNumber} not found. Valid range: 1-${presentation.count}`,
      );
    }

    const apiSlide = presentation.getSlide(slideNumber);
    const domainSlide = parseSlide(apiSlide.content);

    if (!domainSlide) {
      return error("PARSE_ERROR", `Failed to parse slide ${slideNumber}`);
    }

    return success({
      number: apiSlide.number,
      filename: apiSlide.filename,
      shapes: domainSlide.shapes.map(serializeShape),
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
