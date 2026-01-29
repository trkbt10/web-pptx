/**
 * @file info command - display presentation metadata
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer } from "@oxen-office/pptx/app/pptx-loader";
import { openPresentation } from "@oxen-office/pptx";
import { success, error, type Result } from "../output/json-output";
import { EMU_PER_PIXEL } from "@oxen-office/pptx/domain";

export type InfoData = {
  readonly slideCount: number;
  readonly slideSize: {
    readonly width: number;
    readonly height: number;
    readonly widthEmu: number;
    readonly heightEmu: number;
  };
  readonly appVersion: number | null;
};

/**
 * Get presentation metadata from a PPTX file.
 */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const { presentationFile } = await loadPptxBundleFromBuffer(buffer);
    const presentation = openPresentation(presentationFile);

    const widthEmu = Math.round(presentation.size.width * EMU_PER_PIXEL);
    const heightEmu = Math.round(presentation.size.height * EMU_PER_PIXEL);

    return success({
      slideCount: presentation.count,
      slideSize: {
        width: presentation.size.width,
        height: presentation.size.height,
        widthEmu,
        heightEmu,
      },
      appVersion: presentation.appVersion,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
