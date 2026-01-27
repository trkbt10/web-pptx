#!/usr/bin/env bun
/**
 * Generate test PPTX files for text adjustment visual regression tests.
 *
 * Test cases are organized by category:
 * 1. Space handling (half-width/full-width)
 * 2. Bullet spacing
 * 3. Text box layout
 * 4. Line break with character spacing
 *
 * @see ECMA-376 Part 1, Section 21.1.2 for DrawingML text
 */

import {
  generatePptx,
  createComparisonSlide,
  type ParagraphContent,
  type SlideContent,
} from "./lib/pptx-generator";

const BASE_DIR = "fixtures/font-spacing";

// =============================================================================
// 1. Space Handling Tests (half-width/full-width)
// =============================================================================

async function generateSpaceHandlingTests(): Promise<void> {
  console.log("Generating space handling tests...");

  // 1.1 Half-width spaces
  await generatePptx(
    createComparisonSlide([
      { text: "Word Word Word", rPr: { fontSize: 2400 } },
      { text: "Word  Word  Word (double space)", rPr: { fontSize: 2400 } },
      { text: "Word   Word   Word (triple space)", rPr: { fontSize: 2400 } },
      { text: "Half-width space handling", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/space-handling/half-width-spaces.pptx`,
  );

  // 1.2 Full-width spaces (Japanese)
  await generatePptx(
    createComparisonSlide([
      { text: "単語　単語　単語", rPr: { fontSize: 2400 } },
      { text: "単語　　単語　　単語 (double)", rPr: { fontSize: 2400 } },
      { text: "Full-width space (　) handling", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/space-handling/full-width-spaces.pptx`,
  );

  // 1.3 Mixed half/full-width spaces
  await generatePptx(
    createComparisonSlide([
      { text: "English 日本語 Mixed", rPr: { fontSize: 2400 } },
      { text: "English　日本語　Mixed (full-width)", rPr: { fontSize: 2400 } },
      { text: "Mixed space width comparison", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/space-handling/mixed-spaces.pptx`,
  );

  // 1.4 Spaces with character spacing
  await generatePptx(
    createComparisonSlide([
      { text: "A B C D E (normal)", rPr: { fontSize: 2400 } },
      { text: "A B C D E (spc=100)", rPr: { fontSize: 2400, charSpacing: 100 } },
      { text: "A B C D E (spc=-50)", rPr: { fontSize: 2400, charSpacing: -50 } },
      { text: "Space + character spacing interaction", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/space-handling/spaces-with-spc.pptx`,
  );

  console.log("  Created 4 space handling test files");
}

// =============================================================================
// 2. Bullet Spacing Tests
// =============================================================================

async function generateBulletSpacingTests(): Promise<void> {
  console.log("Generating bullet spacing tests...");

  // 2.1 Character bullet with default spacing
  const bulletCharDefault: ParagraphContent[] = [
    {
      text: "First bullet item",
      pPr: {
        marginLeft: 457200, // 0.5 inch
        indent: -228600,    // -0.25 inch (hanging indent)
        bullet: { type: "char", char: "•" },
      },
      rPr: { fontSize: 2000 },
    },
    {
      text: "Second bullet item",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "char", char: "•" },
      },
      rPr: { fontSize: 2000 },
    },
    {
      text: "Third bullet item",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "char", char: "•" },
      },
      rPr: { fontSize: 2000 },
    },
    { text: "Character bullet with marL/indent", rPr: { fontSize: 1200 } },
  ];
  await generatePptx(
    createComparisonSlide(bulletCharDefault),
    `${BASE_DIR}/bullet-spacing/bullet-char-default.pptx`,
  );

  // 2.2 Auto-number bullet
  const bulletAutoNum: ParagraphContent[] = [
    {
      text: "First numbered item",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "auto", autoType: "arabicPeriod" },
      },
      rPr: { fontSize: 2000 },
    },
    {
      text: "Second numbered item",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "auto", autoType: "arabicPeriod" },
      },
      rPr: { fontSize: 2000 },
    },
    {
      text: "Third numbered item",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "auto", autoType: "arabicPeriod" },
      },
      rPr: { fontSize: 2000 },
    },
    { text: "Auto-numbered bullet (arabicPeriod)", rPr: { fontSize: 1200 } },
  ];
  await generatePptx(
    createComparisonSlide(bulletAutoNum),
    `${BASE_DIR}/bullet-spacing/bullet-auto-number.pptx`,
  );

  // 2.3 Nested bullets (different levels)
  const bulletNested: ParagraphContent[] = [
    {
      text: "Level 0 item",
      pPr: {
        level: 0,
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "char", char: "•" },
      },
      rPr: { fontSize: 2000 },
    },
    {
      text: "Level 1 item (indented)",
      pPr: {
        level: 1,
        marginLeft: 914400, // 1 inch
        indent: -228600,
        bullet: { type: "char", char: "◦" },
      },
      rPr: { fontSize: 1800 },
    },
    {
      text: "Level 2 item (more indented)",
      pPr: {
        level: 2,
        marginLeft: 1371600, // 1.5 inch
        indent: -228600,
        bullet: { type: "char", char: "▪" },
      },
      rPr: { fontSize: 1600 },
    },
    {
      text: "Back to Level 0",
      pPr: {
        level: 0,
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "char", char: "•" },
      },
      rPr: { fontSize: 2000 },
    },
    { text: "Nested bullet levels", rPr: { fontSize: 1200 } },
  ];
  await generatePptx(
    createComparisonSlide(bulletNested),
    `${BASE_DIR}/bullet-spacing/bullet-nested.pptx`,
  );

  // 2.4 Bullet with custom font
  const bulletCustomFont: ParagraphContent[] = [
    {
      text: "Wingdings bullet",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "char", char: "l", font: "Wingdings" },
      },
      rPr: { fontSize: 2000 },
    },
    {
      text: "Symbol bullet",
      pPr: {
        marginLeft: 457200,
        indent: -228600,
        bullet: { type: "char", char: "·", font: "Symbol" },
      },
      rPr: { fontSize: 2000 },
    },
    { text: "Custom bullet fonts", rPr: { fontSize: 1200 } },
  ];
  await generatePptx(
    createComparisonSlide(bulletCustomFont),
    `${BASE_DIR}/bullet-spacing/bullet-custom-font.pptx`,
  );

  console.log("  Created 4 bullet spacing test files");
}

// =============================================================================
// 3. Text Box Layout Tests
// =============================================================================

async function generateTextBoxLayoutTests(): Promise<void> {
  console.log("Generating text box layout tests...");

  // 3.1 Vertical anchor positions
  const anchorTopContent: SlideContent = {
    paragraphs: [
      { text: "Top anchored text", rPr: { fontSize: 2400 } },
      { text: "anchor=\"t\"", rPr: { fontSize: 1200 } },
    ],
    bodyPr: { anchor: "t" },
  };
  await generatePptx(anchorTopContent, `${BASE_DIR}/text-box/anchor-top.pptx`);

  const anchorCenterContent: SlideContent = {
    paragraphs: [
      { text: "Center anchored text", rPr: { fontSize: 2400 } },
      { text: "anchor=\"ctr\"", rPr: { fontSize: 1200 } },
    ],
    bodyPr: { anchor: "ctr" },
  };
  await generatePptx(anchorCenterContent, `${BASE_DIR}/text-box/anchor-center.pptx`);

  const anchorBottomContent: SlideContent = {
    paragraphs: [
      { text: "Bottom anchored text", rPr: { fontSize: 2400 } },
      { text: "anchor=\"b\"", rPr: { fontSize: 1200 } },
    ],
    bodyPr: { anchor: "b" },
  };
  await generatePptx(anchorBottomContent, `${BASE_DIR}/text-box/anchor-bottom.pptx`);

  // 3.2 Custom insets
  const customInsetsContent: SlideContent = {
    paragraphs: [
      { text: "Custom insets applied", rPr: { fontSize: 2400 } },
      { text: "Large left/right insets (1 inch each)", rPr: { fontSize: 1800 } },
      { text: "lIns/rIns/tIns/bIns", rPr: { fontSize: 1200 } },
    ],
    bodyPr: {
      lIns: 914400, // 1 inch
      rIns: 914400, // 1 inch
      tIns: 457200, // 0.5 inch
      bIns: 457200, // 0.5 inch
    },
  };
  await generatePptx(customInsetsContent, `${BASE_DIR}/text-box/custom-insets.pptx`);

  // 3.3 No wrap mode
  const noWrapContent: SlideContent = {
    paragraphs: [
      { text: "This is a very long line of text that should not wrap to the next line because wrap mode is set to none", rPr: { fontSize: 2000 } },
      { text: "wrap=\"none\"", rPr: { fontSize: 1200 } },
    ],
    bodyPr: { wrap: "none" },
  };
  await generatePptx(noWrapContent, `${BASE_DIR}/text-box/wrap-none.pptx`);

  console.log("  Created 5 text box layout test files");
}

// =============================================================================
// 4. Line Break with Character Spacing Tests
// =============================================================================

async function generateLineBreakSpacingTests(): Promise<void> {
  console.log("Generating line break with character spacing tests...");

  // 4.1 Line break with character spacing
  const lineBreakWithSpacing: SlideContent = {
    paragraphs: [
      {
        runs: [
          { text: "First line with spacing", rPr: { fontSize: 2400, charSpacing: 50 } },
          { text: "", isBreak: true },
          { text: "Second line with spacing", rPr: { fontSize: 2400, charSpacing: 50 } },
          { text: "", isBreak: true },
          { text: "Third line with spacing", rPr: { fontSize: 2400, charSpacing: 50 } },
        ],
        rPr: { fontSize: 2400, charSpacing: 50 },
      },
      { text: "Line breaks with spc=\"50\"", rPr: { fontSize: 1200 } },
    ],
  };
  await generatePptx(lineBreakWithSpacing, `${BASE_DIR}/line-break/break-with-spacing.pptx`);

  // 4.2 Mixed spacing across line breaks
  const mixedSpacingBreaks: SlideContent = {
    paragraphs: [
      {
        runs: [
          { text: "Normal spacing line", rPr: { fontSize: 2000 } },
          { text: "", isBreak: true },
          { text: "Tight spacing (spc=-50)", rPr: { fontSize: 2000, charSpacing: -50 } },
          { text: "", isBreak: true },
          { text: "Loose spacing (spc=100)", rPr: { fontSize: 2000, charSpacing: 100 } },
        ],
      },
      { text: "Different spacing per line", rPr: { fontSize: 1200 } },
    ],
  };
  await generatePptx(mixedSpacingBreaks, `${BASE_DIR}/line-break/mixed-spacing-breaks.pptx`);

  // 4.3 Line break within word (mixed formatting)
  const mixedFormattingBreaks: SlideContent = {
    paragraphs: [
      {
        runs: [
          { text: "Bold", rPr: { fontSize: 2000, bold: true } },
          { text: " and ", rPr: { fontSize: 2000 } },
          { text: "normal", rPr: { fontSize: 2000 } },
          { text: "", isBreak: true },
          { text: "with line break", rPr: { fontSize: 2000 } },
        ],
      },
      { text: "Mixed formatting with breaks", rPr: { fontSize: 1200 } },
    ],
  };
  await generatePptx(mixedFormattingBreaks, `${BASE_DIR}/line-break/mixed-formatting-breaks.pptx`);

  // 4.4 Multiple paragraphs vs line breaks
  const paragraphsVsBreaks: SlideContent = {
    paragraphs: [
      { text: "Paragraph 1", rPr: { fontSize: 2000 } },
      { text: "Paragraph 2", rPr: { fontSize: 2000 } },
      { text: "Paragraph 3", rPr: { fontSize: 2000 } },
      {
        runs: [
          { text: "Line 1 (with breaks)", rPr: { fontSize: 2000 } },
          { text: "", isBreak: true },
          { text: "Line 2 (with breaks)", rPr: { fontSize: 2000 } },
          { text: "", isBreak: true },
          { text: "Line 3 (with breaks)", rPr: { fontSize: 2000 } },
        ],
      },
      { text: "Paragraphs vs soft line breaks", rPr: { fontSize: 1200 } },
    ],
  };
  await generatePptx(paragraphsVsBreaks, `${BASE_DIR}/line-break/paragraphs-vs-breaks.pptx`);

  console.log("  Created 4 line break spacing test files");
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("=== Generating Text Adjustment Test PPTX Files ===\n");

  await generateSpaceHandlingTests();
  await generateBulletSpacingTests();
  await generateTextBoxLayoutTests();
  await generateLineBreakSpacingTests();

  console.log("\n=== Done ===");
  console.log(`Total: 17 test files generated in ${BASE_DIR}/`);
  console.log("\nNext steps:");
  console.log("1. Generate LibreOffice baselines: ./spec/visual-regression/scripts/generate-snapshots.sh");
  console.log("2. Run visual regression tests: bun run test:visual -- spec/font-spacing/");
}

main().catch(console.error);
