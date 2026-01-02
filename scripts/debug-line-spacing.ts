/**
 * Debug line spacing values being used
 */
import * as fs from "node:fs";
import JSZip from "jszip";
import type { PresentationFile } from "../src/pptx";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "../src/pptx";
import { getByPath } from "../src/xml";

async function loadPptxFile(filePath: string): Promise<PresentationFile> {
  const pptxBuffer = fs.readFileSync(filePath);
  const jszip = await JSZip.loadAsync(pptxBuffer);
  const cache = new Map<string, { text: string; buffer: ArrayBuffer }>();
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
    readText: (fp: string) => cache.get(fp)?.text ?? null,
    readBinary: (fp: string) => cache.get(fp)?.buffer ?? null,
    exists: (fp: string) => cache.has(fp),
  };
}

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
  const presentationFile = await loadPptxFile(pptxPath);

  console.log("=== Checking for multi-line text in table_test.pptx ===");
  
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);
  
  // Get slide content
  const content = slide.content;
  console.log("Slide content children:", content.children.map((c: any) => c?.name || String(c)));
  
  // Get spTree
  const sld = getByPath(content, ["p:sld"]);
  const cSld = sld ? getByPath(sld, ["p:cSld"]) : undefined;
  const spTree = cSld ? getByPath(cSld, ["p:spTree"]) : undefined;
  
  if (spTree) {
    console.log("\nSpTree children:");
    for (const child of (spTree as any).children) {
      if (child?.name) {
        console.log("  -", child.name);
        // Check for text content
        const txBody = getByPath(child, ["p:txBody"]);
        if (txBody) {
          const paragraphs = (txBody as any).children.filter((c: any) => c?.name === "a:p");
          console.log("    Text paragraphs:", paragraphs.length);
          for (const p of paragraphs) {
            const runs = (p as any).children.filter((c: any) => c?.name === "a:r");
            console.log("      Runs:", runs.length);
            for (const r of runs) {
              const t = getByPath(r, ["a:t"]);
              if (t) {
                console.log("        Text:", (t as any).children?.[0]?.slice(0, 50));
              }
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
