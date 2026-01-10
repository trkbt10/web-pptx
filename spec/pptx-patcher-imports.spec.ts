/**
 * Regression test for PPTX patcher import conventions.
 *
 * P1-004: PPTX patcher files should import OOXML/XML helpers (createElement/createText and Xml* types)
 * directly from `src/xml`, not via `src/pptx/patcher/core` barrel exports.
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

describe("PPTX patcher import conventions", () => {
  it("does not import XML helpers or types via pptx/patcher/core barrel", async () => {
    const projectRoot = process.cwd();
    const patcherRoot = path.join(projectRoot, "src/pptx/patcher");

    const tsFiles = await listTsFilesRecursively(patcherRoot);

    const violations: string[] = [];
    let directXmlImports = 0;

    const bannedCoreBarrelImportPattern =
      /import\s+(?:type\s+)?\{[^}]*\b(?:createElement|createText|Xml(?:Element|Document|Node))\b[^}]*\}\s+from\s+["']\.\.\/core["']\s*;?/g;
    const desiredDirectXmlImportPattern = /from\s+["']\.\.\/\.\.\/\.\.\/xml["']\s*;?/g;

    for (const filePath of tsFiles) {
      const source = await fs.readFile(filePath, "utf8");
      if (bannedCoreBarrelImportPattern.test(source)) {
        violations.push(path.relative(projectRoot, filePath));
      }
      directXmlImports += (source.match(desiredDirectXmlImportPattern) ?? []).length;
    }

    expect(violations).toEqual([]);
    expect(directXmlImports).toBeGreaterThan(0);
  });
});

