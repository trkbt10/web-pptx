#!/usr/bin/env bun
/**
 * @file CLI entry point for pptx command
 *
 * Usage:
 *   pptx info <file>
 *   pptx list <file>
 *   pptx show <file> <slide>
 *   pptx extract <file> [--slides <range>]
 *   pptx theme <file>
 */

import { Command } from "commander";
import { runInfo } from "./commands/info";
import { runList } from "./commands/list";
import { runShow } from "./commands/show";
import { runExtract } from "./commands/extract";
import { runTheme } from "./commands/theme";
import { runBuild } from "./commands/build";
import { formatJson, type Result } from "./output/json-output";
import {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatThemePretty,
  formatBuildPretty,
} from "./output/pretty-output";

type OutputMode = "json" | "pretty";

function output<T>(result: Result<T>, mode: OutputMode, prettyFormatter: (data: T) => string): void {
  if (mode === "json") {
    console.log(formatJson(result));
  } else {
    if (result.success) {
      console.log(prettyFormatter(result.data));
    } else {
      console.error(`Error [${result.error.code}]: ${result.error.message}`);
    }
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}

const program = new Command();

program
  .name("pptx")
  .description("CLI tool for inspecting PPTX files")
  .version("0.1.0")
  .option("-o, --output <mode>", "Output mode (json|pretty)", "pretty");

program
  .command("info")
  .description("Display presentation metadata")
  .argument("<file>", "PPTX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runInfo(file);
    output(result, mode, formatInfoPretty);
  });

program
  .command("list")
  .description("List slides with summary")
  .argument("<file>", "PPTX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runList(file);
    output(result, mode, formatListPretty);
  });

program
  .command("show")
  .description("Display slide content")
  .argument("<file>", "PPTX file path")
  .argument("<slide>", "Slide number (1-based)")
  .action(async (file: string, slide: string) => {
    const mode = program.opts().output as OutputMode;
    const slideNumber = parseInt(slide, 10);
    if (Number.isNaN(slideNumber)) {
      console.error("Error: Slide number must be a valid integer");
      process.exitCode = 1;
      return;
    }
    const result = await runShow(file, slideNumber);
    output(result, mode, formatShowPretty);
  });

program
  .command("extract")
  .description("Extract text from slides")
  .argument("<file>", "PPTX file path")
  .option("--slides <range>", "Slide range (e.g., \"1,3-5\")")
  .action(async (file: string, options: { slides?: string }) => {
    const mode = program.opts().output as OutputMode;
    const result = await runExtract(file, options);
    output(result, mode, formatExtractPretty);
  });

program
  .command("theme")
  .description("Display theme information (fonts, colors, styles)")
  .argument("<file>", "PPTX file path")
  .action(async (file: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runTheme(file);
    output(result, mode, formatThemePretty);
  });

program
  .command("build")
  .description("Build PPTX from JSON specification")
  .argument("<spec>", "JSON spec file path")
  .action(async (spec: string) => {
    const mode = program.opts().output as OutputMode;
    const result = await runBuild(spec);
    output(result, mode, formatBuildPretty);
  });

program.parse();
