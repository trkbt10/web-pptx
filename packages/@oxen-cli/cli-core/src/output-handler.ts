/**
 * @file CLI output handler
 */

import type { Result } from "./result";
import { formatJson } from "./json-output";

export type OutputMode = "json" | "pretty";

/**
 * Output a result to the console.
 * Handles both JSON and pretty output modes.
 */
export function output<T>(
  result: Result<T>,
  mode: OutputMode,
  prettyFormatter: (data: T) => string,
): void {
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
