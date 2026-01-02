#!/usr/bin/env bun
/**
 * Debug script - check SVG rendering output
 */

import * as fs from "node:fs";
import JSZip from "jszip";
import type { PresentationFile } from "./src/pptx";
import { openPresentation } from "./src/pptx";

const FIXTURE_PATH = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";

async function loadPptxFile(filePath: string): Promise<PresentationFile> {
  const pptxBuffer = fs.readFileSync(filePath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache = new Map<string, { text: string; buffer: ArrayBuffer }>();

  for (const fp of Object.keys(jszip.files)) {
    const file = jszip.file(fp);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(fp, { text, buffer });
    }
  }

  return {
    readText(fp: string): string | null {
      return cache.get(fp)?.text ?? null;
    },
    readBinary(fp: string): ArrayBuffer | null {
      return cache.get(fp)?.buffer ?? null;
    },
    exists(fp: string): boolean {
      return cache.has(fp);
    },
  };
}

async function main() {
  const presentationFile = await loadPptxFile(FIXTURE_PATH);
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);

  console.log("=== SVG Rendering Output ===\n");

  const svg = slide.renderSVG();

  // Check if CSS is included
  const hasCss = svg.includes("<style");
  console.log("Has embedded CSS:", hasCss);

  // Check for key CSS classes
  const hasBaseClasses = svg.includes(".slide-prgrph");
  console.log("Has base CSS classes:", hasBaseClasses);

  // Check for dynamic CSS classes
  const hasDynamicCss = svg.includes("._css_");
  console.log("Has dynamic CSS classes:", hasDynamicCss);

  // Check for text content
  const hasApache = svg.includes("Apache");
  console.log("Contains 'Apache' text:", hasApache);

  // Check for background
  const hasBackground = svg.includes("background") || svg.includes("<rect") || svg.includes("<image");
  console.log("Has background:", hasBackground);

  // Extract and show CSS
  const cssMatch = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (cssMatch) {
    const cssContent = cssMatch[1].trim();
    console.log("\n=== CSS Content (first 1000 chars) ===");
    console.log(cssContent.substring(0, 1000));
  }

  // Write SVG to file for inspection
  fs.writeFileSync("debug-slide-output.svg", svg);
  console.log("\n=== SVG written to debug-slide-output.svg ===");
}

main().catch(console.error);
