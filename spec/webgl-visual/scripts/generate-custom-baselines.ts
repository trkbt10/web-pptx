#!/usr/bin/env bun
/**
 * Generate Screenshots for Custom Bevel Visual Tests
 *
 * Usage:
 *   bun run spec/webgl-visual/scripts/generate-custom-baselines.ts [options]
 *
 * Options:
 *   --all           Generate all screenshots
 *   --name=<name>   Generate screenshot for specific test
 *   --list          List all available tests
 *   --preview       Generate preview without saving to snapshots (saves to __output__)
 *   --category=<cat> Generate for specific category (extrusion, top, bottom, dual, contour, depth, camera)
 */

import * as path from "node:path";
import * as fs from "node:fs";
import {
  captureCustomBevelScreenshot,
  saveBaseline,
  closeBrowser,
} from "../webgl-compare";
import {
  ALL_CUSTOM_BEVEL_CONFIGS,
  EXTRUSION_ONLY_CONFIGS,
  BEVEL_TOP_CONFIGS,
  BEVEL_BOTTOM_CONFIGS,
  DUAL_BEVEL_CONFIGS,
  CONTOUR_CONFIGS,
  EXTRUSION_DEPTH_CONFIGS,
  CAMERA_ANGLE_CONFIGS,
  COMBINATION_CONFIGS,
  TEXT_LIKE_CONFIGS,
  getCustomConfigByName,
  type CustomBevelTestConfig,
} from "../fixtures/custom-bevel-test-configs";

const SNAPSHOT_NAME = "custom-bevel";

// =============================================================================
// CLI Argument Parsing
// =============================================================================

type CliArgs = {
  all: boolean;
  name: string | null;
  list: boolean;
  preview: boolean;
  category: string | null;
  debug: boolean;
};

function parseArgs(): CliArgs {
  const args: CliArgs = {
    all: false,
    name: null,
    list: false,
    preview: false,
    category: null,
    debug: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--all") {
      args.all = true;
    } else if (arg === "--list") {
      args.list = true;
    } else if (arg === "--preview") {
      args.preview = true;
    } else if (arg === "--debug") {
      args.debug = true;
    } else if (arg.startsWith("--name=")) {
      args.name = arg.slice(7);
    } else if (arg.startsWith("--category=")) {
      args.category = arg.slice(11);
    }
  }

  return args;
}

// =============================================================================
// Category Mapping
// =============================================================================

const CATEGORY_CONFIGS: Record<string, CustomBevelTestConfig[]> = {
  extrusion: EXTRUSION_ONLY_CONFIGS,
  top: BEVEL_TOP_CONFIGS,
  bottom: BEVEL_BOTTOM_CONFIGS,
  dual: DUAL_BEVEL_CONFIGS,
  contour: CONTOUR_CONFIGS,
  depth: EXTRUSION_DEPTH_CONFIGS,
  camera: CAMERA_ANGLE_CONFIGS,
  combo: COMBINATION_CONFIGS,
  text: TEXT_LIKE_CONFIGS,
};

// =============================================================================
// Main Functions
// =============================================================================

function listTests(): void {
  console.log("\nAvailable test configurations:\n");

  console.log("=== Extrusion Only ===");
  for (const config of EXTRUSION_ONLY_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Bevel Top ===");
  for (const config of BEVEL_TOP_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Bevel Bottom ===");
  for (const config of BEVEL_BOTTOM_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Dual Bevel ===");
  for (const config of DUAL_BEVEL_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Contour ===");
  for (const config of CONTOUR_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Extrusion Depth ===");
  for (const config of EXTRUSION_DEPTH_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Camera Angles ===");
  for (const config of CAMERA_ANGLE_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Combination (Contour + Bevel) ===");
  for (const config of COMBINATION_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log("=== Text-Like (Simulating Real Text Pipeline) ===");
  for (const config of TEXT_LIKE_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }

  console.log(`\nTotal: ${ALL_CUSTOM_BEVEL_CONFIGS.length} configurations`);
  console.log("\nCategories: extrusion, top, bottom, dual, contour, depth, camera, combo, text");
}

async function generateScreenshot(
  config: CustomBevelTestConfig,
  preview: boolean,
  debug: boolean,
): Promise<void> {
  console.log(`\nGenerating: ${config.name}`);
  console.log(`  Description: ${config.description}`);

  try {
    const buffer = await captureCustomBevelScreenshot(config.renderConfig, debug);

    if (preview) {
      // Save to __output__ for preview
      const outputDir = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "__output__",
      );
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `${config.name}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`  Preview saved: ${outputPath}`);
    } else {
      const savedPath = saveBaseline(buffer, SNAPSHOT_NAME, config.name);
      console.log(`  Baseline saved: ${savedPath}`);
    }
  } catch (error) {
    console.error(`  Error: ${(error as Error).message}`);
    if ((error as Error).stack) {
      console.error(`  Stack: ${(error as Error).stack}`);
    }
  }
}

async function generateAll(
  configs: CustomBevelTestConfig[],
  preview: boolean,
  debug: boolean,
): Promise<void> {
  console.log(`\nGenerating ${configs.length} screenshots...`);

  for (const config of configs) {
    await generateScreenshot(config, preview, debug);
  }
}

async function generateByName(name: string, preview: boolean, debug: boolean): Promise<void> {
  const config = getCustomConfigByName(name);

  if (!config) {
    console.error(`\nError: Test "${name}" not found.`);
    console.log('\nUse --list to see available tests.');
    process.exit(1);
  }

  await generateScreenshot(config, preview, debug);
}

// =============================================================================
// Entry Point
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.list) {
    listTests();
    return;
  }

  if (!args.all && !args.name && !args.category) {
    console.log(`
Custom Bevel Visual Test Screenshot Generator

Usage:
  bun run spec/webgl-visual/scripts/generate-custom-baselines.ts [options]

Options:
  --all              Generate all screenshots
  --name=<name>      Generate screenshot for specific test
  --list             List all available tests
  --preview          Generate preview without saving to snapshots
  --category=<cat>   Generate for specific category

Categories:
  extrusion    Extrusion only (no bevel)
  top          Bevel Top only
  bottom       Bevel Bottom only
  dual         Dual Bevel (Top + Bottom)
  contour      Contour Width
  depth        Extrusion Depth variations
  camera       Camera Angle variations
  combo        Contour + Bevel combinations
  text         Text-like shapes (simulating real pipeline)

Examples:
  bun run spec/webgl-visual/scripts/generate-custom-baselines.ts --list
  bun run spec/webgl-visual/scripts/generate-custom-baselines.ts --all --preview
  bun run spec/webgl-visual/scripts/generate-custom-baselines.ts --category=top --preview
  bun run spec/webgl-visual/scripts/generate-custom-baselines.ts --name=custom-square-top-circle-medium --preview
`);
    return;
  }

  try {
    if (args.all) {
      await generateAll(ALL_CUSTOM_BEVEL_CONFIGS, args.preview, args.debug);
    } else if (args.category) {
      const configs = CATEGORY_CONFIGS[args.category];
      if (!configs) {
        console.error(`\nError: Unknown category "${args.category}"`);
        console.log("\nAvailable categories: extrusion, top, bottom, dual, contour, depth, camera, combo, text");
        process.exit(1);
      }
      await generateAll(configs, args.preview, args.debug);
    } else if (args.name) {
      await generateByName(args.name, args.preview, args.debug);
    }

    console.log("\nDone!");
  } finally {
    await closeBrowser();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
