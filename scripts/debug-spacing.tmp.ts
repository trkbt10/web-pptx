#!/usr/bin/env bun
/**
 * Debug spacing differences by comparing SVG output with baseline
 */

import * as fs from "node:fs";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "../src/pptx";
import { compareSvgToSnapshot } from "../spec/visual-regression/compare";
import { loadPptxFile } from "./lib/pptx-loader";

async function debugTest(pptxPath: string, name: string): Promise<void> {
  console.log(`\n=== Debugging: ${name} ===\n`);

  const presentationFile = await loadPptxFile(pptxPath);
  const presentation = openPresentation(presentationFile, {
    renderOptions: LIBREOFFICE_RENDER_OPTIONS,
  });
  const slide = presentation.getSlide(1);
  const svg = slide.renderSVG();

  // Save SVG for inspection
  fs.writeFileSync(`/tmp/${name}-output.svg`, svg);
  console.log(`SVG saved to: /tmp/${name}-output.svg`);

  const result = compareSvgToSnapshot(svg, name, 1, {
    maxDiffPercent: 100,
  });

  console.log(`Diff: ${result.diffPercent.toFixed(2)}%`);
  console.log(`Diff pixels: ${result.diffPixels} / ${result.totalPixels}`);
  if (result.diffImagePath) {
    console.log(`Diff image: ${result.diffImagePath}`);
  }

  // Parse SVG to analyze text positioning
  const textMatches = svg.matchAll(/<text[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*>(.*?)<\/text>/gs);
  console.log("\nText elements:");
  for (const match of textMatches) {
    const x = match[1];
    const y = match[2];
    const content = match[3].replace(/<[^>]+>/g, "").substring(0, 50);
    console.log(`  x=${x}, y=${y}: "${content}..."`);
  }

  // Check for tspan with dx
  const tspanMatches = svg.matchAll(/<tspan[^>]*dx="([^"]*)"[^>]*>([^<]*)<\/tspan>/g);
  console.log("\nTspan with dx:");
  let count = 0;
  for (const match of tspanMatches) {
    if (count < 10) {
      console.log(`  dx=${match[1]}: "${match[2]}"`);
    }
    count++;
  }
  if (count > 10) {
    console.log(`  ... and ${count - 10} more`);
  }
}

async function main(): Promise<void> {
  // Debug the highest diff tests
  const tests = [
    ["fixtures/font-spacing/character-spacing/char-spacing-values.pptx", "char-spacing-values"],
    ["fixtures/font-spacing/kerning/kerning-default.pptx", "kerning-default"],
    ["fixtures/font-spacing/line-spacing/line-spacing-double.pptx", "line-spacing-double"],
  ];

  for (const [pptxPath, name] of tests) {
    await debugTest(pptxPath, name);
  }
}

main().catch(console.error);
