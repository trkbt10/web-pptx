/**
 * Regression test for domain type import conventions.
 *
 * P1-008: PPTX domain files should import OOXML `Color` directly, not via
 * `src/pptx/domain/color/types.ts`.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

async function listTsFilesRecursively(dir: string): Promise<readonly string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTsFilesRecursively(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  files.sort();
  return files;
}

describe("PPTX domain import conventions", () => {
  it("does not import OOXML Color via pptx/domain/color/types", async () => {
    const projectRoot = process.cwd();
    const pptxDomainRoot = path.join(projectRoot, "src/pptx/domain");

    const excluded = new Set<string>([
      path.join(pptxDomainRoot, "types.ts"),
      path.join(pptxDomainRoot, "color/types.ts"),
      path.join(pptxDomainRoot, "index.ts"),
    ]);

    const tsFiles = (await listTsFilesRecursively(pptxDomainRoot)).filter(
      (filePath) => !excluded.has(filePath)
    );

    const importsColorFromPptxColorTypes: string[] = [];
    let importsColorFromOoxml = 0;

    const bannedImportPattern =
      /import\s+(?:type\s+)?\{[^}]*\bColor\b[^}]*\}\s+from\s+["'][^"']*color\/types["']\s*;?/g;
    const desiredImportPattern = /from\s+["'][^"']*ooxml\/domain\/color["']\s*;?/g;

    for (const filePath of tsFiles) {
      const source = await fs.readFile(filePath, "utf8");
      if (bannedImportPattern.test(source)) {
        importsColorFromPptxColorTypes.push(path.relative(projectRoot, filePath));
      }
      importsColorFromOoxml += (source.match(desiredImportPattern) ?? []).length;
    }

    expect(importsColorFromPptxColorTypes).toEqual([]);
    expect(importsColorFromOoxml).toBeGreaterThan(0);
  });
});

