/**
 * @file Debug font extraction for k-resource-dl.pdf
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { importPdf } from "./pdf-importer";

describe("k-resource-dl.pdf font debug", () => {
  it("should analyze embedded fonts and text font-family", async () => {
    const pdfPath = path.resolve("fixtures/samples/k-resource-dl.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("k-resource-dl.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    console.log("\n=== k-resource-dl.pdf Font Analysis ===\n");

    // 1. Embedded fonts
    console.log("1. Embedded fonts:");
    if (document.embeddedFonts && document.embeddedFonts.length > 0) {
      for (const font of document.embeddedFonts) {
        const magic = Array.from(font.data.slice(0, 4))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        console.log(`   - "${font.fontFamily}" (${font.format}, ${font.data.length} bytes, magic: ${magic})`);
      }
    } else {
      console.log("   (no embedded fonts)");
    }

    // 2. @font-face CSS
    console.log("\n2. @font-face font-families:");
    if (document.embeddedFontCss) {
      const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g;
      let match;
      while ((match = fontFaceRegex.exec(document.embeddedFontCss)) !== null) {
        console.log(`   - "${match[1]}"`);
      }
    } else {
      console.log("   (no @font-face CSS)");
    }

    // 3. Font families used in text shapes
    console.log("\n3. Font families used in text shapes:");
    const usedFonts = new Map<string, string[]>();
    for (const slideWithId of document.slides) {
      for (const shape of slideWithId.slide.shapes) {
        if (shape.type === "sp" && shape.textBody) {
          for (const para of shape.textBody.paragraphs) {
            for (const run of para.runs) {
              if (run.type === "text" && run.properties?.fontFamily) {
                const fontFamily = run.properties.fontFamily;
                const text = run.text.slice(0, 20);
                if (!usedFonts.has(fontFamily)) {
                  usedFonts.set(fontFamily, []);
                }
                usedFonts.get(fontFamily)!.push(text);
              }
            }
          }
        }
      }
    }
    for (const [fontFamily, texts] of usedFonts) {
      console.log(`   - "${fontFamily}": ${texts.slice(0, 3).map(t => `"${t}"`).join(", ")}${texts.length > 3 ? "..." : ""}`);
    }

    // 4. Check for mismatches
    console.log("\n4. Font matching analysis:");
    const embeddedFontFamilies = new Set(document.embeddedFonts?.map(f => f.fontFamily) ?? []);
    const usedFontFamilies = new Set(usedFonts.keys());

    const matched = [...usedFontFamilies].filter(f => embeddedFontFamilies.has(f));
    const unmatched = [...usedFontFamilies].filter(f => !embeddedFontFamilies.has(f));

    console.log(`   Matched: ${matched.length > 0 ? matched.map(f => `"${f}"`).join(", ") : "(none)"}`);
    console.log(`   Unmatched: ${unmatched.length > 0 ? unmatched.map(f => `"${f}"`).join(", ") : "(none)"}`);

    // 5. Check @font-face CSS format
    console.log("\n5. @font-face CSS sample:");
    if (document.embeddedFontCss) {
      // Extract first @font-face rule (without the huge base64 data)
      const firstRule = document.embeddedFontCss.match(/@font-face\s*\{[^}]+\}/);
      if (firstRule) {
        console.log(firstRule[0].replace(/url\("[^"]+"\)/, 'url("data:...truncated...")'));
      }
    }

    // 6. Verify TrueType structure
    console.log("\n6. TrueType table structure:");
    for (const font of document.embeddedFonts ?? []) {
      const data = font.data;
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);

      if (magic === "\x00\x01\x00\x00" || magic === "true") {
        const numTables = (data[4] << 8) | data[5];
        const tables: string[] = [];
        for (let i = 0; i < Math.min(numTables, 20); i++) {
          const offset = 12 + i * 16;
          const tag = String.fromCharCode(data[offset], data[offset+1], data[offset+2], data[offset+3]);
          tables.push(tag);
        }
        console.log(`   ${font.fontFamily}: ${tables.join(", ")}`);
        console.log(`     cmap: ${tables.includes("cmap")}, glyf: ${tables.includes("glyf")}, loca: ${tables.includes("loca")}`);
      }
    }

    expect(true).toBe(true);
  });
});
