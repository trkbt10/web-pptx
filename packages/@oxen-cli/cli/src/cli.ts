#!/usr/bin/env bun
import { Command } from "commander";
import { createProgram as createPptxProgram } from "@oxen-cli/pptx-cli";
import { createProgram as createDocxProgram } from "@oxen-cli/docx-cli";
import { createProgram as createXlsxProgram } from "@oxen-cli/xlsx-cli";

const program = new Command();

program
  .name("oxen")
  .description("Unified CLI for Office document inspection")
  .version("0.1.0");

program.addCommand(createPptxProgram());
program.addCommand(createDocxProgram());
program.addCommand(createXlsxProgram());

program.parse();
