/**
 * @file comments command - display document comments
 */

import * as fs from "node:fs/promises";
import { loadDocx } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import { extractTextFromBlockContent } from "@oxen-office/docx/domain/text-utils";

// =============================================================================
// Types
// =============================================================================

export type CommentJson = {
  readonly id: number;
  readonly author: string;
  readonly initials?: string;
  readonly date?: string;
  readonly text: string;
};

export type CommentsData = {
  readonly count: number;
  readonly comments: readonly CommentJson[];
};

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display comments from a DOCX file.
 */
export async function runComments(filePath: string): Promise<Result<CommentsData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const doc = await loadDocx(buffer);

    if (!doc.comments || doc.comments.comment.length === 0) {
      return success({
        count: 0,
        comments: [],
      });
    }

    const comments: CommentJson[] = doc.comments.comment.map((c) => ({
      id: c.id,
      author: c.author,
      ...(c.initials && { initials: c.initials }),
      ...(c.date && { date: c.date }),
      text: c.content.map(extractTextFromBlockContent).join("\n"),
    }));

    return success({
      count: comments.length,
      comments,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
