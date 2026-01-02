/**
 * @file Integration tests for mc:AlternateContent handling with real PPTX files
 *
 * Tests that mc:AlternateContent is properly handled across the parser pipeline.
 *
 * @see ECMA-376 Part 3, Section 10.2.1
 */

import * as fs from "node:fs";
import JSZip from "jszip";
import type { PresentationFile } from "../src/pptx";
import { openPresentation } from "../src/pptx";

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

async function loadPptxFile(filePath: string): Promise<PresentationFile> {
  const pptxBuffer = fs.readFileSync(filePath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache: FileCache = new Map();
  const files = Object.keys(jszip.files);

  for (const fp of files) {
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

describe("mc:AlternateContent Integration", () => {
  describe("2411-Performance_Up.pptx slide 5 (p:blipFill in mc:AlternateContent)", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    let svg: string = "";

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        const presentationFile = await loadPptxFile(pptxPath);
        const presentation = openPresentation(presentationFile);
        const slide = presentation.getSlide(5);
        svg = slide.renderSVG();
      }
    });

    it("renders images from mc:Fallback blipFill", () => {
      // Should contain image elements from the mc:Fallback path
      expect(svg).toContain("<image");
      // Should have embedded image data
      expect(svg).toContain("data:image");
    });
  });

  describe("bug64693.pptx (p:oleObj in mc:AlternateContent)", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/bug64693.pptx";
    let svg: string = "";

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        const presentationFile = await loadPptxFile(pptxPath);
        const presentation = openPresentation(presentationFile);
        const slide = presentation.getSlide(1);
        svg = slide.renderSVG();
      }
    });

    it("parses OLE objects with mc:AlternateContent without throwing", () => {
      // Should produce valid SVG
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });

  describe("bug54570.pptx (p:oleObj in mc:AlternateContent)", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/bug54570.pptx";
    let svg: string = "";

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        const presentationFile = await loadPptxFile(pptxPath);
        const presentation = openPresentation(presentationFile);
        const slide = presentation.getSlide(1);
        svg = slide.renderSVG();
      }
    });

    it("parses OLE objects with mc:AlternateContent without throwing", () => {
      // Should produce valid SVG
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });
});
