/**
 * @file info command - display document metadata
 */

import * as fs from "node:fs/promises";
import { loadDocx, twipsToPoints } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";

export type InfoData = {
  readonly paragraphCount: number;
  readonly tableCount: number;
  readonly sectionCount: number;
  readonly pageSize?: {
    readonly width: number;
    readonly height: number;
    readonly widthTwips: number;
    readonly heightTwips: number;
    readonly orientation?: "portrait" | "landscape";
  };
  readonly hasStyles: boolean;
  readonly hasNumbering: boolean;
  readonly hasHeaders: boolean;
  readonly hasFooters: boolean;
  readonly hasComments: boolean;
};

function countParagraphs(content: readonly { type: string }[]): number {
  return content.filter((c) => c.type === "paragraph").length;
}

function countTables(content: readonly { type: string }[]): number {
  return content.filter((c) => c.type === "table").length;
}

function countSections(content: readonly { type: string }[]): number {
  // Section breaks in content + final section
  const sectionBreaks = content.filter((c) => c.type === "sectionBreak").length;
  return sectionBreaks + 1;
}

/**
 * Get document metadata from a DOCX file.
 */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const doc = await loadDocx(buffer);

    const sectPr = doc.body.sectPr;
    const pageSize = sectPr?.pgSz
      ? {
          width: twipsToPoints(sectPr.pgSz.w),
          height: twipsToPoints(sectPr.pgSz.h),
          widthTwips: sectPr.pgSz.w,
          heightTwips: sectPr.pgSz.h,
          orientation: sectPr.pgSz.orient,
        }
      : undefined;

    return success({
      paragraphCount: countParagraphs(doc.body.content),
      tableCount: countTables(doc.body.content),
      sectionCount: countSections(doc.body.content),
      pageSize,
      hasStyles: doc.styles !== undefined,
      hasNumbering: doc.numbering !== undefined,
      hasHeaders: doc.headers !== undefined && doc.headers.size > 0,
      hasFooters: doc.footers !== undefined && doc.footers.size > 0,
      hasComments: doc.comments !== undefined && doc.comments.comment.length > 0,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
