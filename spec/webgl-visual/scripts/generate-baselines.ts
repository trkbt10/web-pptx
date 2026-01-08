#!/usr/bin/env bun
/**
 * Generate Baselines for WebGL Visual Tests
 *
 * Usage:
 *   bun run spec/webgl-visual/scripts/generate-baselines.ts [options]
 *
 * Options:
 *   --all           Generate all baselines
 *   --name=<name>   Generate baseline for specific test
 *   --list          List all available tests
 *   --preview       Generate preview without saving (saves to __output__)
 */

import * as path from "node:path";
import * as fs from "node:fs";
import {
  captureWebGLScreenshot,
  saveBaseline,
  closeBrowser,
} from "../webgl-compare";
import {
  ALL_BEVEL_CONFIGS,
  getConfigByName,
  type BevelTestConfig,
} from "../fixtures/bevel-test-configs";

const SNAPSHOT_NAME = "bevel";

// =============================================================================
// CLI Argument Parsing
// =============================================================================

type CliArgs = {
  all: boolean;
  name: string | null;
  list: boolean;
  preview: boolean;
};

function parseArgs(): CliArgs {
  const args: CliArgs = {
    all: false,
    name: null,
    list: false,
    preview: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--all") {
      args.all = true;
    } else if (arg === "--list") {
      args.list = true;
    } else if (arg === "--preview") {
      args.preview = true;
    } else if (arg.startsWith("--name=")) {
      args.name = arg.slice(7);
    }
  }

  return args;
}

// =============================================================================
// Main Functions
// =============================================================================

function listTests(): void {
  console.log("\nAvailable test configurations:\n");

  for (const config of ALL_BEVEL_CONFIGS) {
    console.log(`  ${config.name}`);
    console.log(`    ${config.description}\n`);
  }
}

async function generateBaseline(
  config: BevelTestConfig,
  preview: boolean,
): Promise<void> {
  console.log(`\nGenerating: ${config.name}`);
  console.log(`  Description: ${config.description}`);

  try {
    const buffer = await captureWebGLScreenshot(config.renderConfig);

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
  }
}

async function generateAll(preview: boolean): Promise<void> {
  console.log(`\nGenerating ${ALL_BEVEL_CONFIGS.length} baselines...\n`);

  for (const config of ALL_BEVEL_CONFIGS) {
    await generateBaseline(config, preview);
  }
}

async function generateByName(name: string, preview: boolean): Promise<void> {
  const config = getConfigByName(name);

  if (!config) {
    console.error(`\nError: Test "${name}" not found.`);
    console.log('\nUse --list to see available tests.');
    process.exit(1);
  }

  await generateBaseline(config, preview);
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

  if (!args.all && !args.name) {
    console.log(`
WebGL Visual Test Baseline Generator

Usage:
  bun run spec/webgl-visual/scripts/generate-baselines.ts [options]

Options:
  --all           Generate all baselines
  --name=<name>   Generate baseline for specific test
  --list          List all available tests
  --preview       Generate preview without saving to snapshots

Examples:
  bun run spec/webgl-visual/scripts/generate-baselines.ts --list
  bun run spec/webgl-visual/scripts/generate-baselines.ts --all
  bun run spec/webgl-visual/scripts/generate-baselines.ts --name=square-top-bevel-circle
  bun run spec/webgl-visual/scripts/generate-baselines.ts --name=square-dual-bevel-symmetric --preview
`);
    return;
  }

  try {
    if (args.all) {
      await generateAll(args.preview);
    } else if (args.name) {
      await generateByName(args.name, args.preview);
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
