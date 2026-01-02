/**
 * @file DrawingML processing module
 *
 * Provides parser, domain, and render functions for DrawingML elements.
 * Follows the 3-axis architecture: parser → domain → render.
 *
 * @see ECMA-376 Part 1, Chapter 20 (DrawingML)
 */

// Domain types and functions
export * from "./domain";

// Parser functions
export * from "./parser";

// Render functions
export * from "./render";
