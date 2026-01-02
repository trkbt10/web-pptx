#!/usr/bin/env bun
/**
 * @file Demo runner for PPTX to HTML conversion
 * Processes all PPTX files in fixtures and outputs to demo/output/
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const FIXTURE_DIRS = [
  "fixtures/poi-test-data/test-data/slideshow",
  "fixtures/poi-test-data/test-data/xmldsign",
];

const OUTPUT_DIR = "demo/output";
const CLI_PATH = "src/pptx-cli.ts";

type ProcessResult = {
  file: string;
  success: boolean;
  slides?: number;
  time?: number;
  error?: string;
};

function findPptxFiles(dirs: string[]): string[] {
  const files: string[] = [];
  for (const dir of dirs) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) {
      console.warn(`Directory not found: ${dir}`);
      continue;
    }
    const entries = fs.readdirSync(fullDir);
    for (const entry of entries) {
      if (entry.endsWith(".pptx")) {
        files.push(path.join(fullDir, entry));
      }
    }
  }
  return files.sort();
}

function processFile(inputPath: string, outputDir: string): ProcessResult {
  const basename = path.basename(inputPath, ".pptx");
  const outputPath = path.join(outputDir, `${basename}.html`);

  try {
    const result = execSync(
      `bun ${CLI_PATH} --input "${inputPath}" --output "${outputPath}"`,
      { encoding: "utf-8", timeout: 30000 }
    );

    const slidesMatch = result.match(/Generated (\d+) slides/);
    const timeMatch = result.match(/Processing time: (\d+)ms/);

    return {
      file: path.basename(inputPath),
      success: true,
      slides: slidesMatch ? parseInt(slidesMatch[1], 10) : undefined,
      time: timeMatch ? parseInt(timeMatch[1], 10) : undefined,
    };
  } catch (err) {
    return {
      file: path.basename(inputPath),
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function generateIndexHtml(results: ProcessResult[], outputDir: string): void {
  const successFiles = results.filter((r) => r.success);
  const failedFiles = results.filter((r) => !r.success);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPTX Demo Index</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { margin-bottom: 20px; color: #333; }
    h2 { margin: 20px 0 10px; color: #555; }
    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .stat {
      background: white;
      padding: 15px 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-value { font-size: 24px; font-weight: bold; color: #333; }
    .stat-label { color: #666; font-size: 14px; }
    .file-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 10px;
    }
    .file-item {
      background: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-item a {
      color: #0066cc;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-item a:hover { text-decoration: underline; }
    .file-meta {
      color: #888;
      font-size: 12px;
      white-space: nowrap;
      margin-left: 10px;
    }
    .failed-item {
      background: #fff0f0;
      color: #c00;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>PPTX Demo Output</h1>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${results.length}</div>
      <div class="stat-label">Total Files</div>
    </div>
    <div class="stat">
      <div class="stat-value">${successFiles.length}</div>
      <div class="stat-label">Successful</div>
    </div>
    <div class="stat">
      <div class="stat-value">${failedFiles.length}</div>
      <div class="stat-label">Failed</div>
    </div>
  </div>

  <h2>Converted Files (${successFiles.length})</h2>
  <div class="file-list">
    ${successFiles
      .map(
        (r) => `
    <div class="file-item">
      <a href="${r.file.replace(".pptx", ".html")}" target="_blank">${r.file}</a>
      <span class="file-meta">${r.slides ?? "?"} slides, ${r.time ?? "?"}ms</span>
    </div>`
      )
      .join("")}
  </div>

  ${
    failedFiles.length > 0
      ? `
  <h2>Failed Files (${failedFiles.length})</h2>
  ${failedFiles.map((r) => `<div class="failed-item">${r.file}</div>`).join("")}
  `
      : ""
  }
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, "index.html"), html);
}

async function main(): Promise<void> {
  console.log("Finding PPTX files...");
  const files = findPptxFiles(FIXTURE_DIRS);
  console.log(`Found ${files.length} PPTX files\n`);

  // Create output directory
  const outputDir = path.resolve(OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: ProcessResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${i + 1}/${files.length}]`;
    process.stdout.write(`${progress} Processing ${path.basename(file)}... `);

    const result = processFile(file, outputDir);
    results.push(result);

    if (result.success) {
      console.log(`✓ ${result.slides} slides (${result.time}ms)`);
    } else {
      console.log(`✗ Failed`);
    }
  }

  // Generate index.html
  generateIndexHtml(results, outputDir);

  // Summary
  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Total: ${results.length} files`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nOutput: ${outputDir}/index.html`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
