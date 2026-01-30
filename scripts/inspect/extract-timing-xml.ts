/**
 * Extract and display raw timing XML from PPTX files
 *
 * Usage:
 *   bun run scripts/inspect/extract-timing-xml.ts <pptx-path> <slide-number>
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main(): Promise<void> {
  const usage = "bun run scripts/inspect/extract-timing-xml.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
  const slideNum = String(requireIntArg(args[1], "slide-number", usage));
  requireFileExists(pptxPath, usage);

  const { cache } = await loadPptxFile(pptxPath);
  const filePaths = Array.from(cache.keys());

  const slidePath = `ppt/slides/slide${slideNum}.xml`;
  const slideXml = cache.get(slidePath)?.text;

  if (!slideXml) {
    console.error(`Slide not found: ${slidePath}`);
    const slides = filePaths.filter((f) => f.match(/^ppt\/slides\/slide\d+\.xml$/));
    console.log("Available slides:", slides.join(", "));
    process.exit(1);
  }

  // Extract p:timing element
  const timingMatch = slideXml.match(/<p:timing[\s\S]*?<\/p:timing>/);

  if (!timingMatch) {
    console.log("No p:timing element found in this slide.");
    return;
  }

  console.log("=".repeat(70));
  console.log(`p:timing element from ${pptxPath} slide ${slideNum}`);
  console.log("=".repeat(70));

  // Pretty print XML
  const xml = timingMatch[0];
  const prettyXml = formatXml(xml);
  console.log(prettyXml);
}

/**
 * Simple XML formatter for readability
 */
function formatXml(xml: string): string {
  let result = "";
  let indent = 0;
  const parts = xml.replace(/></g, ">\n<").split("\n");

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {continue;}

    // Decrease indent for closing tags
    if (trimmed.startsWith("</")) {
      indent = Math.max(0, indent - 1);
    }

    result += "  ".repeat(indent) + trimmed + "\n";

    // Increase indent for opening tags (not self-closing)
    if (
      trimmed.startsWith("<") &&
      !trimmed.startsWith("</") &&
      !trimmed.endsWith("/>") &&
      !trimmed.includes("</")
    ) {
      indent++;
    }
  }

  return result;
}

main().catch(console.error);
