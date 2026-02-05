/**
 * @file preview command - ASCII art visualization of slides
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { parseSlide } from "@oxen-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@oxen-cli/cli-core";
import { serializeShape } from "../serializers/shape-serializer";
import { renderSlideAscii } from "@oxen-renderer/pptx/ascii";

export type PreviewSlide = {
  readonly number: number;
  readonly filename: string;
  readonly ascii: string;
  readonly shapeCount: number;
};

export type PreviewData = {
  readonly slides: readonly PreviewSlide[];
  readonly slideWidth: number;
  readonly slideHeight: number;
};

export type PreviewOptions = {
  readonly width: number;
  readonly border?: boolean;
};

/**
 * Generate an ASCII art preview of one or all slides.
 */
export async function runPreview(
  filePath: string,
  slideNumber: number | undefined,
  options: PreviewOptions,
): Promise<Result<PreviewData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const { presentationFile } = await loadPptxBundleFromBuffer(buffer);
    const presentation = openPresentation(presentationFile);

    if (slideNumber !== undefined && (slideNumber < 1 || slideNumber > presentation.count)) {
      return error(
        "SLIDE_NOT_FOUND",
        `Slide ${slideNumber} not found. Valid range: 1-${presentation.count}`,
      );
    }

    const start = slideNumber ?? 1;
    const end = slideNumber ?? presentation.count;
    const slides: PreviewSlide[] = [];

    for (let i = start; i <= end; i++) {
      const apiSlide = presentation.getSlide(i);
      const domainSlide = parseSlide(apiSlide.content);

      if (!domainSlide) {
        continue;
      }

      const shapes = domainSlide.shapes.map(serializeShape);
      const ascii = renderSlideAscii({
        shapes,
        slideWidth: presentation.size.width,
        slideHeight: presentation.size.height,
        terminalWidth: options.width,
        showBorder: options.border,
      });

      slides.push({
        number: apiSlide.number,
        filename: apiSlide.filename,
        ascii,
        shapeCount: shapes.length,
      });
    }

    return success({
      slides,
      slideWidth: presentation.size.width,
      slideHeight: presentation.size.height,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
