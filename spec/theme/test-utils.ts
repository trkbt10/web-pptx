/**
 * @file Shared test utilities for theme tests
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import * as fs from "node:fs";
import JSZip from "jszip";

export const THEMES_PPTX_PATH = "fixtures/poi-test-data/test-data/slideshow/themes.pptx";

/**
 * Helper to create presentation file interface from buffer
 */
export async function createPresentationFile(pptxPath: string): Promise<{
  readText: (fp: string) => string | null;
  readBinary: (fp: string) => ArrayBuffer | null;
  exists: (fp: string) => boolean;
}> {
  const pptxBuffer = fs.readFileSync(pptxPath);
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
    readText: (fp: string) => cache.get(fp)?.text ?? null,
    readBinary: (fp: string) => cache.get(fp)?.buffer ?? null,
    exists: (fp: string) => cache.has(fp),
  };
}

/**
 * Helper to extract colors from SVG
 */
export function extractSvgColors(svg: string): Set<string> {
  const colorPatterns = [
    /#[0-9a-fA-F]{6}/g, // hex colors
    /#[0-9a-fA-F]{3}/g, // short hex colors
    /stop-color="([^"]+)"/g, // gradient stops
  ];
  const colors = new Set<string>();

  for (const pattern of colorPatterns) {
    const matches = svg.matchAll(pattern);
    for (const match of matches) {
      const color = match[1] ?? match[0];
      colors.add(color.toLowerCase().replace("#", ""));
    }
  }

  return colors;
}
